import { useState, useEffect } from "react";
import { getDocuments } from "../lib/supabase";

export default function Insights() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await getDocuments();
    setDocuments(docs);
    setLoading(false);
  };

  // Calculate stats from documents
  const approvedDocs = documents.filter((doc) => doc.status === "approved");
  const totalSpend = approvedDocs.reduce(
    (sum, doc) => sum + parseFloat(doc.amount || 0),
    0,
  );
  const totalDocuments = documents.length;
  const approvedCount = approvedDocs.length;
  const approvalRate =
    totalDocuments > 0
      ? ((approvedCount / totalDocuments) * 100).toFixed(1)
      : 0;

  // Get top vendor
  const vendorSpending = {};
  approvedDocs.forEach((doc) => {
    const vendor = doc.vendor_name;
    const amount = parseFloat(doc.amount || 0);
    vendorSpending[vendor] = (vendorSpending[vendor] || 0) + amount;
  });
  const topVendor =
    Object.entries(vendorSpending).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "None";

  // Calculate monthly trend
  const monthlySpending = {};
  approvedDocs.forEach((doc) => {
    const date = new Date(doc.date);
    const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
    const amount = parseFloat(doc.amount || 0);
    monthlySpending[monthYear] = (monthlySpending[monthYear] || 0) + amount;
  });
  const months = Object.keys(monthlySpending).slice(-2);
  const trend =
    months.length === 2
      ? monthlySpending[months[1]] > monthlySpending[months[0]]
        ? "up"
        : "down"
      : "stable";

  // Find anomalies
  const allAmounts = approvedDocs.map((d) => parseFloat(d.amount || 0));
  const avgAmount =
    allAmounts.reduce((a, b) => a + b, 0) / (allAmounts.length || 1);
  const anomalies = approvedDocs.filter(
    (doc) => parseFloat(doc.amount || 0) > avgAmount * 1.5,
  );

  // Pending documents
  const pendingDocs = documents.filter(
    (d) => d.status !== "approved" && d.status !== "rejected",
  );
  const rejectedDocs = documents.filter((d) => d.status === "rejected");

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      default:
        return "📊";
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "#ef4444";
      case "down":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  // Calculated insights (no API call needed)
  const spendingInsight =
    trend === "up"
      ? `Spending has increased. Total approved spend: R ${totalSpend.toLocaleString()}.`
      : `Spending is stable. Total approved spend: R ${totalSpend.toLocaleString()}.`;

  const anomalyInsight =
    anomalies.length > 0
      ? `${anomalies.length} document(s) were identified as unusually high.`
      : "No unusual spending patterns detected.";

  const recommendationInsight =
    pendingDocs.length > 0
      ? `${pendingDocs.length} document(s) are waiting for approval.`
      : "All documents have been processed. Great work!";

  const summary = `Your approval rate is ${approvalRate}% with ${approvedCount} approved out of ${totalDocuments} total documents.`;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>
          🤖 AI Insights
        </h1>
        <p style={{ color: "#6b7280", marginTop: "4px" }}>
          Smart analysis of your documents — trends, anomalies, and spending
          insights
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>
          Loading insights...
        </div>
      ) : documents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <p style={{ color: "#6b7280" }}>No documents uploaded yet.</p>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
            Upload invoices to see AI-powered insights
          </p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
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
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                Approval Rate
              </p>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#10b981",
                }}>
                {approvalRate}%
              </p>
            </div>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                Total Spend (Approved)
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}>
                R {totalSpend.toLocaleString()}
              </p>
            </div>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                Pending Documents
              </p>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#f59e0b",
                }}>
                {pendingDocs.length}
              </p>
            </div>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>Top Vendor</p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}>
                {topVendor}
              </p>
            </div>
          </div>

          {/* Document Analysis Card */}
          <div
            style={{
              backgroundColor: "#f0f9ff",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "24px",
              border: "1px solid #bae6fd",
            }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}>
              <div style={{ fontSize: "28px" }}>📊</div>
              <div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#1e3a8a",
                  }}>
                  Document Analysis
                </h3>
                <p style={{ fontSize: "12px", color: "#3b82f6" }}>
                  Analyzing your uploaded documents
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginTop: "16px",
              }}>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                }}>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>Top Vendor</p>
                <p style={{ fontWeight: "600", color: "#1f2937" }}>
                  {topVendor !== "None" ? topVendor : "No data"}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                }}>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>
                  Average Amount
                </p>
                <p style={{ fontWeight: "600", color: "#1f2937" }}>
                  R {avgAmount.toFixed(2)}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                }}>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>
                  Highest Amount
                </p>
                <p
                  style={{
                    fontWeight: "600",
                    color: anomalies.length > 0 ? "#dc2626" : "#1f2937",
                  }}>
                  R{" "}
                  {allAmounts.length > 0
                    ? Math.max(...allAmounts).toLocaleString()
                    : "0"}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                }}>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>
                  Documents Status
                </p>
                <p style={{ fontWeight: "600", color: "#1f2937" }}>
                  {approvedCount} Approved / {pendingDocs.length} Pending /{" "}
                  {rejectedDocs.length} Rejected
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "white",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#1e3a8a",
              }}>
              <strong>📋 Insight:</strong>{" "}
              {anomalies.length > 0
                ? `${anomalies.length} document(s) have amounts significantly higher than your average of R ${avgAmount.toFixed(
                    2,
                  )}. Review them for accuracy.`
                : pendingDocs.length > 0
                  ? `${pendingDocs.length} document(s) are pending approval. Route them through the workflow.`
                  : rejectedDocs.length > 0
                    ? `${rejectedDocs.length} document(s) were rejected. Review them to identify common issues.`
                    : `All documents processed. Your top vendor is ${
                        topVendor === "None" ? "unknown" : topVendor
                      }.`}
            </div>
          </div>

          {/* Spending Trends */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "24px",
            }}>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
              }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "#1f2937",
                }}>
                {getTrendIcon()} Spending Trend
              </h3>
              {Object.keys(monthlySpending).length === 0 ? (
                <p
                  style={{
                    color: "#9ca3af",
                    textAlign: "center",
                    padding: "20px",
                  }}>
                  No data yet
                </p>
              ) : (
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <span style={{ color: getTrendColor(), fontSize: "14px" }}>
                      {trend === "up"
                        ? "📈 Spending increased compared to previous month"
                        : trend === "down"
                          ? "📉 Spending decreased compared to previous month"
                          : "📊 Spending stable"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}>
                    {Object.entries(monthlySpending)
                      .slice(-4)
                      .map(([month, amount]) => {
                        const maxAmount = Math.max(
                          ...Object.values(monthlySpending),
                        );
                        const width = (amount / maxAmount) * 100;
                        return (
                          <div key={month}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px",
                                marginBottom: "4px",
                              }}>
                              <span style={{ color: "#6b7280" }}>{month}</span>
                              <span style={{ color: "#1f2937" }}>
                                R {amount.toLocaleString()}
                              </span>
                            </div>
                            <div
                              style={{
                                backgroundColor: "#e5e7eb",
                                borderRadius: "8px",
                                height: "24px",
                                overflow: "hidden",
                              }}>
                              <div
                                style={{
                                  width: `${width}%`,
                                  backgroundColor: "#3b82f6",
                                  height: "24px",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  paddingRight: "8px",
                                  color: "white",
                                  fontSize: "11px",
                                }}>
                                {width > 15
                                  ? `R ${amount.toLocaleString()}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Anomalies List */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
              }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "#1f2937",
                }}>
                ⚠️ Detected Anomalies
              </h3>
              {anomalies.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                    ✅
                  </div>
                  <p style={{ color: "#10b981", fontSize: "14px" }}>
                    No anomalies detected
                  </p>
                  <p
                    style={{
                      color: "#9ca3af",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}>
                    All documents are within normal range
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}>
                  {anomalies.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: "12px",
                        backgroundColor: "#fef3c7",
                        borderRadius: "8px",
                        border: "1px solid #fde68a",
                      }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}>
                        <span style={{ fontWeight: "500", color: "#92400e" }}>
                          {doc.file_name}
                        </span>
                        <span style={{ fontWeight: "bold", color: "#d97706" }}>
                          R {parseFloat(doc.amount).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#78350f" }}>
                        {doc.vendor_name} • {doc.date}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#92400e",
                          marginTop: "4px",
                        }}>
                        ⚠️{" "}
                        {(
                          (parseFloat(doc.amount) / avgAmount - 1) *
                          100
                        ).toFixed(0)}
                        % above average (R {avgAmount.toFixed(2)})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations Summary */}
          <div
            style={{
              backgroundColor: "#f0fdf4",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #bbf7d0",
            }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#166534",
              }}>
              💡 Smart Recommendations
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pendingDocs.length > 3 && (
                <p style={{ fontSize: "13px", color: "#14532d" }}>
                  • {pendingDocs.length} documents are pending approval. Review
                  them to reduce bottlenecks.
                </p>
              )}
              {topVendor !== "None" && topVendor !== "Unknown Vendor" && (
                <p style={{ fontSize: "13px", color: "#14532d" }}>
                  • {topVendor} is your top vendor. Consider negotiating bulk
                  discounts.
                </p>
              )}
              {approvalRate < 50 && (
                <p style={{ fontSize: "13px", color: "#14532d" }}>
                  • Approval rate is low ({approvalRate}%). Review rejected
                  documents to identify common issues.
                </p>
              )}
              {trend === "up" && (
                <p style={{ fontSize: "13px", color: "#14532d" }}>
                  • Spending is increasing. Review recent approved documents for
                  cost optimization.
                </p>
              )}
              {pendingDocs.length === 0 && documents.length > 0 && (
                <p style={{ fontSize: "13px", color: "#14532d" }}>
                  • All documents are processed. Great work! Keep uploading to
                  track more insights.
                </p>
              )}
              {anomalies.length > 0 && (
                <p style={{ fontSize: "13px", color: "#14532d" }}>
                  • {anomalies.length} unusual transaction(s) detected. Review
                  them for accuracy.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
