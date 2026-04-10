import { useState, useEffect } from "react";
import { getDocuments } from "../lib/supabase";
import { supabase } from "../lib/supabase";

export default function Workflow() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const userRole = localStorage.getItem("userRole") || "viewer";
  const userName = localStorage.getItem("userName") || "User";

  // Load documents from Supabase - refreshes when refreshKey changes
  useEffect(() => {
    loadDocuments();
  }, [refreshKey]);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await getDocuments();
    console.log(
      "Loaded documents:",
      docs.map((d) => ({ id: d.id, status: d.status, name: d.file_name })),
    );
    setDocuments(docs);
    setLoading(false);
  };

  // Add notification function
  const addNotification = (title, message, type, documentId, documentName) => {
    const existing = localStorage.getItem("notifications");
    const notifications = existing ? JSON.parse(existing) : [];

    const newNotification = {
      id: Date.now(),
      title,
      message,
      type,
      documentId,
      documentName,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newNotification, ...notifications];
    localStorage.setItem("notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  // Determine which step this role approves
  const getApprovalStep = () => {
    switch (userRole) {
      case "reviewer":
        return 1;
      case "manager":
        return 2;
      case "admin":
      case "finance_admin":
        return 3;
      default:
        return null;
    }
  };

  // Filter documents pending current user's approval
  const pendingForUser = documents.filter((doc) => {
    if (doc.status === "approved" || doc.status === "rejected") return false;

    const approvalStep = getApprovalStep();
    if (approvalStep === 1 && doc.status === "pending_reviewer") return true;
    if (approvalStep === 2 && doc.status === "pending_manager") return true;
    if (approvalStep === 3 && doc.status === "pending_finance") return true;
    return false;
  });

  // Handle approve action - with approvals tracking
  const handleApprove = async (docId) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    let newStatus = "";
    let step = 0;
    if (doc.status === "pending_reviewer") {
      newStatus = "pending_manager";
      step = 1;
    } else if (doc.status === "pending_manager") {
      newStatus = "pending_finance";
      step = 2;
    } else if (doc.status === "pending_finance") {
      newStatus = "approved";
      step = 3;
    }

    console.log("=== APPROVING ===");
    console.log("Document ID:", docId);
    console.log("Current status:", doc.status);
    console.log("New status:", newStatus);
    console.log("Step:", step);
    console.log("User role:", userRole);

    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // Update document status
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .update({ status: newStatus })
      .eq("id", docId)
      .select();

    if (docError) {
      console.error("Update error:", docError);
      alert("Failed to update: " + docError.message);
      return;
    }

    console.log("Document update response:", docData);

    if (docData && docData.length > 0) {
      // Insert into approvals table
      const { data: approvalData, error: approvalError } = await supabase
        .from("approvals")
        .insert([
          {
            document_id: docId,
            step: step,
            approved_by: userId,
            status: "approved",
            comment: `Approved by ${userRole}`,
          },
        ])
        .select();

      if (approvalError) {
        console.error("Approval insert error:", approvalError);
      } else {
        console.log("Approval record inserted:", approvalData);
      }

      // Add notification
      addNotification(
        "Document Approved",
        `${doc.file_name} has been approved by ${userRole}. ${newStatus === "approved" ? "Final approval complete!" : "Moved to next step."}`,
        "approved",
        doc.id,
        doc.file_name,
      );

      // Force refresh
      setRefreshKey((prev) => prev + 1);
    } else {
      console.error("No data returned from update");
    }
  };

  // Handle reject action - with approvals tracking
  const handleReject = async (docId) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    let step = 0;
    if (doc.status === "pending_reviewer") step = 1;
    else if (doc.status === "pending_manager") step = 2;
    else if (doc.status === "pending_finance") step = 3;

    console.log("=== REJECTING ===");
    console.log("Document ID:", docId);
    console.log("Current status:", doc.status);
    console.log("Step:", step);

    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // Update document status
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .update({ status: "rejected" })
      .eq("id", docId)
      .select();

    if (docError) {
      console.error("Update error:", docError);
      alert("Failed to update: " + docError.message);
      return;
    }

    console.log("Document update response:", docData);

    if (docData && docData.length > 0) {
      // Insert into approvals table
      const { data: approvalData, error: approvalError } = await supabase
        .from("approvals")
        .insert([
          {
            document_id: docId,
            step: step,
            approved_by: userId,
            status: "rejected",
            comment: `Rejected by ${userRole}`,
          },
        ])
        .select();

      if (approvalError) {
        console.error("Approval insert error:", approvalError);
      } else {
        console.log("Approval record inserted:", approvalData);
      }

      // Add notification
      addNotification(
        "Document Rejected",
        `${doc.file_name} has been rejected by ${userRole}.`,
        "rejected",
        doc.id,
        doc.file_name,
      );

      // Force refresh
      setRefreshKey((prev) => prev + 1);
    } else {
      console.error("No data returned from update");
    }
  };

  const approvalStep = getApprovalStep();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}>
        <div>
          <h1
            style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>
            Approval Workflow
          </h1>
          <p style={{ color: "#6b7280", marginTop: "4px" }}>
            Review and approve documents based on your role
          </p>
        </div>
        <div
          style={{
            backgroundColor: "#e5e7eb",
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "14px",
          }}>
          Role: {userRole === "finance_admin" ? "Finance/Admin" : userRole} •{" "}
          {userName}
        </div>
      </div>

      {/* Workflow steps indicator */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid #e5e7eb",
        }}>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "#1f2937",
          }}>
          📋 3-Step Approval Process
        </h2>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              backgroundColor: userRole === "reviewer" ? "#f3e8ff" : "#f3f4f6",
              padding: "16px",
              borderRadius: "12px",
              border:
                userRole === "reviewer"
                  ? "2px solid #9333ea"
                  : "1px solid #e5e7eb",
            }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
            <div style={{ fontWeight: "bold", color: "#1f2937" }}>Step 1</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Reviewer</div>
            {userRole === "reviewer" && (
              <div
                style={{
                  fontSize: "12px",
                  backgroundColor: "#9333ea",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  marginTop: "8px",
                  display: "inline-block",
                }}>
                Your Role
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: userRole === "manager" ? "#dbeafe" : "#f3f4f6",
              padding: "16px",
              borderRadius: "12px",
              border:
                userRole === "manager"
                  ? "2px solid #2563eb"
                  : "1px solid #e5e7eb",
            }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📊</div>
            <div style={{ fontWeight: "bold", color: "#1f2937" }}>Step 2</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Manager</div>
            {userRole === "manager" && (
              <div
                style={{
                  fontSize: "12px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  marginTop: "8px",
                  display: "inline-block",
                }}>
                Your Role
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor:
                userRole === "admin" || userRole === "finance_admin"
                  ? "#d1fae5"
                  : "#f3f4f6",
              padding: "16px",
              borderRadius: "12px",
              border:
                userRole === "admin" || userRole === "finance_admin"
                  ? "2px solid #059669"
                  : "1px solid #e5e7eb",
            }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>💰</div>
            <div style={{ fontWeight: "bold", color: "#1f2937" }}>Step 3</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Finance/Admin
            </div>
            {(userRole === "admin" || userRole === "finance_admin") && (
              <div
                style={{
                  fontSize: "12px",
                  backgroundColor: "#059669",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  marginTop: "8px",
                  display: "inline-block",
                }}>
                Your Role
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents pending approval */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e5e7eb",
        }}>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "#1f2937",
          }}>
          📄 Documents Pending Your Approval
          {pendingForUser.length > 0 && (
            <span
              style={{
                marginLeft: "8px",
                backgroundColor: "#f59e0b",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
              }}>
              {pendingForUser.length}
            </span>
          )}
        </h2>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>
            Loading...
          </div>
        ) : pendingForUser.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "#9ca3af",
            }}>
            ✅ No documents pending your approval.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {pendingForUser.map((doc) => (
              <div
                key={doc.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: "#f9fafb",
                }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}>
                  <div style={{ flex: 2 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                      }}>
                      <span style={{ fontSize: "20px" }}>
                        {doc.document_type === "invoice" ? "📄" : "📝"}
                      </span>
                      <span style={{ fontWeight: "bold", color: "#1f2937" }}>
                        {doc.file_name}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          backgroundColor:
                            doc.document_type === "invoice"
                              ? "#dbeafe"
                              : "#fef3c7",
                          color:
                            doc.document_type === "invoice"
                              ? "#1e40af"
                              : "#92400e",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}>
                        {doc.document_type === "invoice"
                          ? "INVOICE"
                          : "CREDIT NOTE"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "8px",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}>
                      <div>
                        <span style={{ color: "#6b7280" }}>Vendor:</span>{" "}
                        <span style={{ color: "#1f2937" }}>
                          {doc.vendor_name}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Invoice #:</span>{" "}
                        <span style={{ color: "#1f2937" }}>
                          {doc.invoice_number}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Date:</span>{" "}
                        <span style={{ color: "#1f2937" }}>{doc.date}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Amount:</span>{" "}
                        <span style={{ color: "#1f2937", fontWeight: "500" }}>
                          R {parseFloat(doc.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => handleApprove(doc.id)}
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "8px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}>
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(doc.id)}
                      style={{
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}>
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History section - already approved/rejected */}
      {documents.filter(
        (doc) => doc.status === "approved" || doc.status === "rejected",
      ).length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "24px",
            marginTop: "24px",
            border: "1px solid #e5e7eb",
          }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#1f2937",
            }}>
            📜 History
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {documents
              .filter(
                (doc) => doc.status === "approved" || doc.status === "rejected",
              )
              .slice(0, 5)
              .map((doc) => (
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
                    <span style={{ fontWeight: "500", color: "#1f2937" }}>
                      {doc.file_name}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginLeft: "8px",
                      }}>
                      {doc.vendor_name} • R{" "}
                      {parseFloat(doc.amount).toLocaleString()}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      backgroundColor:
                        doc.status === "approved" ? "#d1fae5" : "#fee2e2",
                      color: doc.status === "approved" ? "#065f46" : "#991b1b",
                    }}>
                    {doc.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
