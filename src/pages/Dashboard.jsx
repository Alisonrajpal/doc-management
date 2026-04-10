import { useState, useEffect } from "react";
import { getDocuments } from "../lib/supabase";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userRole = localStorage.getItem("userRole") || "viewer";
  const userName = localStorage.getItem("userName") || "User";

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await getDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.error("Error loading documents:", err);
      setError("Failed to load documents. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from documents
  const totalDocuments = documents.length;
  const pendingDocuments = documents.filter(
    (doc) =>
      doc.status === "pending_reviewer" ||
      doc.status === "pending_manager" ||
      doc.status === "pending_finance",
  ).length;
  const approvedDocuments = documents.filter(
    (doc) => doc.status === "approved",
  ).length;
  const rejectedDocuments = documents.filter(
    (doc) => doc.status === "rejected",
  ).length;

  const totalApprovedAmount = documents
    .filter((doc) => doc.status === "approved")
    .reduce((sum, doc) => sum + parseFloat(doc.amount || 0), 0);

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    .slice(0, 5);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#6b7280" }}>Loading dashboard...</p>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
            First load may take 30-60 seconds (backend waking up)
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "48px" }}>
        <p style={{ color: "#ef4444" }}>{error}</p>
        <button
          onClick={loadDocuments}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}>
          Retry
        </button>
      </div>
    );
  }

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
            Dashboard
          </h1>
          <p style={{ color: "#6b7280", marginTop: "4px" }}>
            Welcome back,{" "}
            <span style={{ fontWeight: "semibold", color: "#1f2937" }}>
              {userName}
            </span>
          </p>
        </div>
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

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "24px",
        }}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Total Documents</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1f2937" }}>
            {totalDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Pending Approval</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
            {pendingDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Approved</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981" }}>
            {approvedDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Total Value</p>
          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937" }}>
            R {totalApprovedAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
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
            color: "#1f2937",
            marginBottom: "16px",
          }}>
          Recent Activity
        </h2>
        {recentDocuments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#9ca3af" }}>No documents uploaded yet</p>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
              Upload your first invoice or credit note
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentDocuments.map((doc) => (
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}>
                    <span>{doc.document_type === "invoice" ? "📄" : "📝"}</span>
                    <p style={{ fontWeight: "500", color: "#1f2937" }}>
                      {doc.file_name}
                    </p>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>
                    {doc.vendor_name} • R{" "}
                    {parseFloat(doc.amount).toLocaleString()}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    backgroundColor:
                      doc.status === "approved"
                        ? "#d1fae5"
                        : doc.status === "rejected"
                          ? "#fee2e2"
                          : "#fef3c7",
                    color:
                      doc.status === "approved"
                        ? "#065f46"
                        : doc.status === "rejected"
                          ? "#991b1b"
                          : "#92400e",
                  }}>
                  {doc.status === "approved"
                    ? "Approved"
                    : doc.status === "rejected"
                      ? "Rejected"
                      : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
