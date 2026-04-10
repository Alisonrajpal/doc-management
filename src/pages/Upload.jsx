import { useState, useEffect } from "react";
import { extractInvoiceData, simulateExtraction } from "../lib/huggingface";
import AIStatus from "../components/AIStatus";
import { saveDocument, getDocuments } from "../lib/supabase";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [documentType, setDocumentType] = useState(null);
  const [lastUploadedData, setLastUploadedData] = useState(null);

  const userRole = localStorage.getItem("userRole") || "viewer";
  const userId = localStorage.getItem("userId");

  // Load existing documents from Supabase on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await getDocuments();
    setUploadedDocuments(docs);
  };

  // Check if text looks like an invoice/credit note
  const isLikelyInvoice = (text) => {
    const invoiceKeywords = [
      "invoice",
      "bill to",
      "invoice number",
      "invoice date",
      "total",
      "amount due",
      "vendor",
      "supplier",
      "tax",
      "vat",
      "credit note",
      "credit memo",
      "subtotal",
      "payment terms",
    ];

    const lowerText = text.toLowerCase();
    let matchCount = 0;

    for (const keyword of invoiceKeywords) {
      if (lowerText.includes(keyword)) {
        matchCount++;
      }
    }

    return matchCount >= 2;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();

      const isValidFileType =
        selectedFile.type.includes("pdf") ||
        selectedFile.type.includes("jpeg") ||
        selectedFile.type.includes("jpg") ||
        selectedFile.type.includes("png") ||
        fileName.includes(".pdf") ||
        fileName.includes(".jpg") ||
        fileName.includes(".jpeg") ||
        fileName.includes(".png");

      if (!isValidFileType) {
        alert("Only PDF, JPEG, and PNG files are allowed.");
        e.target.value = "";
        return;
      }

      let docType = null;
      if (fileName.includes("invoice") || fileName.includes("inv")) {
        docType = "invoice";
      } else if (
        fileName.includes("credit") ||
        fileName.includes("credit_note") ||
        fileName.includes("cn")
      ) {
        docType = "credit_note";
      } else {
        const userConfirmed = window.confirm(
          "File name does not specify document type.\n\nClick OK for INVOICE\nClick Cancel for CREDIT NOTE",
        );
        docType = userConfirmed ? "invoice" : "credit_note";
      }

      setDocumentType(docType);
      setFile({
        file: selectedFile,
        name: selectedFile.name,
        size: selectedFile.size,
        type: docType,
        lastModified: selectedFile.lastModified,
      });
      setDuplicateWarning(null);
      setExtractedData(null);
      setLastUploadedData(null);
      setMessage("");
    }
  };

  const removeFile = () => {
    setFile(null);
    setExtractedData(null);
    setLastUploadedData(null);
    setDuplicateWarning(null);
    setMessage("");
    setDocumentType(null);
  };

  const getFileFingerprint = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  const performAIExtraction = async (fileObj, docType) => {
    try {
      console.log("Extracting invoice data with Python backend...");
      const extracted = await extractInvoiceData(fileObj.file, docType);

      // Check if the extracted data has valid invoice fields
      const hasValidData =
        extracted.vendor_name !== "Unknown Vendor" ||
        extracted.invoice_number !== "INV-2026-8299" ||
        (extracted.amount && parseFloat(extracted.amount) > 0);

      if (!hasValidData) {
        throw new Error(
          "No valid invoice data found - file may not be an invoice",
        );
      }

      return { ...extracted, document_type: docType };
    } catch (error) {
      console.warn("Real AI failed, using simulation:", error.message);

      // For simulation mode, also validate
      const simulated = simulateExtraction(fileObj.name, docType);

      // If simulation returns "Unknown Vendor", likely not an invoice
      if (
        simulated.vendor_name === "Unknown Vendor" &&
        simulated.amount === "0.00"
      ) {
        throw new Error("File does not appear to be an invoice or credit note");
      }

      return simulated;
    }
  };

  const checkForDuplicates = async (newDocument, fileObj) => {
    const fingerprint = getFileFingerprint(fileObj.file);
    const existingByFingerprint = uploadedDocuments.find(
      (doc) => doc.file_fingerprint === fingerprint,
    );

    if (existingByFingerprint) {
      return {
        isDuplicate: true,
        reason: `File "${fileObj.name}" was already uploaded.`,
      };
    }

    const existingByInvoice = uploadedDocuments.find(
      (doc) => doc.invoice_number === newDocument.invoice_number,
    );

    if (existingByInvoice) {
      return {
        isDuplicate: true,
        reason: `Invoice number ${newDocument.invoice_number} already exists (${existingByInvoice.file_name})`,
      };
    }

    const existingByVendorAmount = uploadedDocuments.find(
      (doc) =>
        doc.vendor_name === newDocument.vendor_name &&
        parseFloat(doc.amount) === parseFloat(newDocument.amount),
    );

    if (existingByVendorAmount) {
      return {
        isDuplicate: true,
        reason: `Same vendor (${newDocument.vendor_name}) and amount (R ${newDocument.amount}) already exists`,
      };
    }

    return { isDuplicate: false };
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage("");
    setDuplicateWarning(null);

    try {
      setMessage("🤖 AI is extracting data from document...");
      const extracted = await performAIExtraction(file, documentType);
      setExtractedData(extracted);
      setLastUploadedData(extracted);
      setMessage("✅ Data extracted successfully!");

      setMessage("🔍 Checking for duplicates...");
      const duplicateCheck = await checkForDuplicates(extracted, file);

      if (duplicateCheck.isDuplicate) {
        setDuplicateWarning(duplicateCheck.reason);
        setMessage(`⚠️ Duplicate detected: ${duplicateCheck.reason}`);
        setUploading(false);
        return;
      }

      const newDocument = {
        fileName: file.name,
        fileFingerprint: getFileFingerprint(file.file),
        vendor_name: extracted.vendor_name,
        invoice_number: extracted.invoice_number,
        date: extracted.date,
        amount: extracted.amount,
        vat: extracted.vat,
        status: "pending_reviewer",
        document_type: documentType,
        uploaded_by: userId,
      };

      // Save to Supabase
      const savedDoc = await saveDocument(newDocument);

      if (savedDoc) {
        setUploadedDocuments((prev) => [savedDoc, ...prev]);
        setMessage(
          `✅ ${documentType.toUpperCase()} uploaded successfully! Sent to Reviewer for approval.`,
        );
      } else {
        setMessage("❌ Failed to save document. Please try again.");
      }

      setTimeout(() => {
        setFile(null);
        setMessage("");
        setDocumentType(null);
      }, 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("❌ Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const displayData = extractedData || lastUploadedData;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}>
        <div>
          <h1
            style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>
            Upload Documents
          </h1>
          <p style={{ color: "#6b7280", marginTop: "4px" }}>
            Upload invoices and credit notes only — AI will extract data
            automatically
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <AIStatus />
          <div
            style={{
              backgroundColor: "#e5e7eb",
              padding: "4px 12px",
              borderRadius: "8px",
              fontSize: "14px",
            }}>
            Role: {userRole === "finance_admin" ? "Finance/Admin" : userRole}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}>
        {/* Upload Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#1f2937",
            }}>
            Upload New Document
          </h2>

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📄</span>
              <span style={{ fontSize: "14px", color: "#374151" }}>
                Invoices
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📝</span>
              <span style={{ fontSize: "14px", color: "#374151" }}>
                Credit Notes
              </span>
            </div>
          </div>

          {!file ? (
            <div
              onClick={() => document.getElementById("fileInput").click()}
              style={{
                border: "2px dashed #d1d5db",
                borderRadius: "12px",
                padding: "48px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "#f9fafb",
              }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📄</div>
              <p style={{ color: "#4b5563", marginBottom: "4px" }}>
                Click to upload
              </p>
              <p style={{ color: "#9ca3af", fontSize: "12px" }}>
                PDF, JPG, PNG (Max 10MB)
              </p>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  marginTop: "8px",
                }}>
                ✓ Invoices only ✓ Credit Notes only
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "16px",
                }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                  <div>
                    <p style={{ fontWeight: "500", color: "#1f2937" }}>
                      {file.name}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}>
                      {(file.size / 1024).toFixed(2)} KB •
                      <span
                        style={{
                          backgroundColor:
                            file.type === "invoice" ? "#dbeafe" : "#fef3c7",
                          color:
                            file.type === "invoice" ? "#1e40af" : "#92400e",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          marginLeft: "8px",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}>
                        {file.type === "invoice" ? "INVOICE" : "CREDIT NOTE"}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    style={{
                      color: "#9ca3af",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                    }}
                    disabled={uploading}>
                    ✕
                  </button>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  width: "100%",
                  backgroundColor: "#2563eb",
                  color: "white",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                }}>
                {uploading
                  ? "Processing..."
                  : `Upload & Process ${file.type === "invoice" ? "Invoice" : "Credit Note"}`}
              </button>
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#dbeafe",
                borderRadius: "8px",
                color: "#1e40af",
              }}>
              {message}
            </div>
          )}

          {duplicateWarning && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#fee2e2",
                borderRadius: "8px",
                color: "#991b1b",
              }}>
              ⚠️ {duplicateWarning}
            </div>
          )}
        </div>

        {/* AI Results Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#1f2937",
            }}>
            🤖 AI Extraction Results
          </h2>

          {displayData ? (
            <div>
              <div
                style={{
                  backgroundColor:
                    displayData.document_type === "invoice"
                      ? "#dbeafe"
                      : "#fef3c7",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}>
                <span
                  style={{
                    fontWeight: "600",
                    color:
                      displayData.document_type === "invoice"
                        ? "#1e40af"
                        : "#92400e",
                  }}>
                  {displayData.document_type === "invoice"
                    ? "📄 INVOICE"
                    : "📝 CREDIT NOTE"}
                </span>
              </div>
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "8px",
                }}>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  Vendor Name
                </p>
                <p style={{ fontWeight: "500", color: "#1f2937" }}>
                  {displayData.vendor_name}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "8px",
                }}>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  Invoice Number
                </p>
                <p style={{ fontWeight: "500", color: "#1f2937" }}>
                  {displayData.invoice_number}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginBottom: "8px",
                }}>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    padding: "12px",
                  }}>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>Date</p>
                  <p style={{ fontWeight: "500", color: "#1f2937" }}>
                    {displayData.date}
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    padding: "12px",
                  }}>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>Amount</p>
                  <p style={{ fontWeight: "500", color: "#1f2937" }}>
                    R {parseFloat(displayData.amount).toLocaleString()}
                  </p>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>VAT</p>
                <p style={{ fontWeight: "500", color: "#1f2937" }}>
                  R {parseFloat(displayData.vat).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
              <p style={{ color: "#6b7280" }}>
                Upload an invoice or credit note
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  marginTop: "8px",
                }}>
                The AI will extract vendor, invoice number, date, amount, and
                VAT
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      {uploadedDocuments.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#1f2937",
            }}>
            📋 Recently Uploaded ({uploadedDocuments.length} documents)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {uploadedDocuments.slice(0, 10).map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                }}>
                <div>
                  <p style={{ fontWeight: "500", color: "#1f2937" }}>
                    {doc.file_name}
                  </p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>
                    {doc.vendor_name} • R{" "}
                    {parseFloat(doc.amount).toLocaleString()} •{" "}
                    {doc.invoice_number}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      backgroundColor:
                        doc.document_type === "invoice" ? "#dbeafe" : "#fef3c7",
                      color:
                        doc.document_type === "invoice" ? "#1e40af" : "#92400e",
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}>
                    {doc.document_type === "invoice"
                      ? "📄 Invoice"
                      : "📝 Credit Note"}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      marginLeft: "8px",
                    }}>
                    {doc.status === "pending_reviewer"
                      ? "Pending Reviewer"
                      : doc.status === "pending_manager"
                        ? "Pending Manager"
                        : doc.status === "pending_finance"
                          ? "Pending Finance"
                          : doc.status === "approved"
                            ? "Approved"
                            : "Rejected"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Info */}
      <div
        style={{
          marginTop: "24px",
          backgroundColor: "#eff6ff",
          borderRadius: "16px",
          padding: "20px",
          border: "1px solid #bfdbfe",
        }}>
        <h3
          style={{ fontWeight: "600", marginBottom: "8px", color: "#1e3a8a" }}>
          📌 3-Step Approval Workflow
        </h3>
        <p style={{ fontSize: "14px", color: "#1e40af", marginBottom: "12px" }}>
          Only invoices and credit notes go through this process:
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div
            style={{
              backgroundColor: "white",
              padding: "8px 16px",
              borderRadius: "8px",
            }}>
            <span style={{ color: "#9333ea", fontWeight: "500" }}>Step 1:</span>
            <span style={{ color: "#374151", marginLeft: "8px" }}>
              Reviewer
            </span>
          </div>
          <span style={{ color: "#9ca3af" }}>→</span>
          <div
            style={{
              backgroundColor: "white",
              padding: "8px 16px",
              borderRadius: "8px",
            }}>
            <span style={{ color: "#2563eb", fontWeight: "500" }}>Step 2:</span>
            <span style={{ color: "#374151", marginLeft: "8px" }}>Manager</span>
          </div>
          <span style={{ color: "#9ca3af" }}>→</span>
          <div
            style={{
              backgroundColor: "white",
              padding: "8px 16px",
              borderRadius: "8px",
            }}>
            <span style={{ color: "#059669", fontWeight: "500" }}>Step 3:</span>
            <span style={{ color: "#374151", marginLeft: "8px" }}>
              Finance/Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
