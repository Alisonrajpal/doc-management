import { useState, useEffect } from "react";
import { getDocuments } from "../lib/supabase";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const userRole = localStorage.getItem("userRole") || "viewer";
  const userName = localStorage.getItem("userName") || "User";

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await getDocuments();
    setDocuments(docs);
    setLoading(false);
  };

  // Calculate real stats from Supabase documents
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

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return "👑";
      case "reviewer":
        return "🔍";
      case "manager":
        return "📊";
      case "finance_admin":
        return "💰";
      case "viewer":
        return "👁️";
      default:
        return "👤";
    }
  };

  const getRolePermissions = () => {
    switch (userRole) {
      case "admin":
        return {
          canUpload: true,
          canApprove: true,
          canViewReports: true,
          badge: "Can approve Step 3 (Final)",
        };
      case "reviewer":
        return {
          canUpload: true,
          canApprove: true,
          canViewReports: true,
          badge: "Can approve Step 1",
        };
      case "manager":
        return {
          canUpload: true,
          canApprove: true,
          canViewReports: true,
          badge: "Can approve Step 2",
        };
      case "finance_admin":
        return {
          canUpload: true,
          canApprove: true,
          canViewReports: true,
          badge: "Can approve Step 3 (Final)",
        };
      case "viewer":
        return {
          canUpload: true,
          canApprove: false,
          canViewReports: true,
          badge: "View only - cannot approve",
        };
      default:
        return {};
    }
  };

  const permissions = getRolePermissions();

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return { text: "Approved", color: "#10b981", bg: "#d1fae5" };
      case "rejected":
        return { text: "Rejected", color: "#ef4444", bg: "#fee2e2" };
      case "pending_reviewer":
        return { text: "Pending Reviewer", color: "#f59e0b", bg: "#fef3c7" };
      case "pending_manager":
        return { text: "Pending Manager", color: "#f59e0b", bg: "#fef3c7" };
      case "pending_finance":
        return { text: "Pending Finance", color: "#f59e0b", bg: "#fef3c7" };
      default:
        return { text: status, color: "#6b7280", bg: "#f3f4f6" };
    }
  };

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

      {/* Role Badge Card */}
      <div
        style={{
          backgroundColor: "#f0f9ff",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "24px",
          border: "1px solid #bae6fd",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}>
            <span style={{ fontSize: "24px" }}>{getRoleIcon(userRole)}</span>
          </div>
          <div>
            <p style={{ color: "#1f2937", fontWeight: "600" }}>
              Your Permissions
            </p>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              {permissions.badge}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - From Supabase */}
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
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Total Documents</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1f2937" }}>
            {loading ? "..." : totalDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Pending Approval</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
            {loading ? "..." : pendingDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Approved</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981" }}>
            {loading ? "..." : approvedDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>
            Total Value (Approved)
          </p>
          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937" }}>
            R {loading ? "..." : totalApprovedAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recent Activity - From Supabase */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
        {loading ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>
            Loading...
          </p>
        ) : recentDocuments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#9ca3af" }}>No documents uploaded yet</p>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
              Upload your first invoice or credit note to get started
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentDocuments.map((doc) => {
              const statusBadge = getStatusBadge(doc.status);
              return (
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
                      <span style={{ fontSize: "16px" }}>
                        {doc.document_type === "invoice" ? "📄" : "📝"}
                      </span>
                      <p style={{ fontWeight: "500", color: "#1f2937" }}>
                        {doc.file_name}
                      </p>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor:
                            doc.document_type === "invoice"
                              ? "#dbeafe"
                              : "#fef3c7",
                          color:
                            doc.document_type === "invoice"
                              ? "#1e40af"
                              : "#92400e",
                        }}>
                        {doc.document_type === "invoice"
                          ? "INVOICE"
                          : "CREDIT NOTE"}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      {doc.vendor_name} • R{" "}
                      {parseFloat(doc.amount).toLocaleString()} • Uploaded{" "}
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.color,
                    }}>
                    {statusBadge.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
