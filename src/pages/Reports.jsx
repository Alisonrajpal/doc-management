import { useState, useEffect } from "react";
import { getDocuments } from "../lib/supabase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendor, setFilterVendor] = useState("");
  const [vendors, setVendors] = useState([]);

  const userRole = localStorage.getItem("userRole") || "viewer";

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await getDocuments();
    setDocuments(docs);
    // Extract unique vendors
    const uniqueVendors = [
      ...new Set(docs.map((doc) => doc.vendor_name).filter(Boolean)),
    ];
    setVendors(uniqueVendors);
    setLoading(false);
  };

  // Calculate summary statistics
  const totalDocuments = documents.length;
  const totalApproved = documents.filter((d) => d.status === "approved").length;
  const totalPending = documents.filter(
    (d) => d.status !== "approved" && d.status !== "rejected",
  ).length;
  const totalRejected = documents.filter((d) => d.status === "rejected").length;
  const totalAmount = documents
    .filter((d) => d.status === "approved")
    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

  // Data for Status Pie Chart
  const statusData = [
    { name: "Approved", value: totalApproved, color: "#10b981" },
    { name: "Pending", value: totalPending, color: "#f59e0b" },
    { name: "Rejected", value: totalRejected, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  // Data for Vendor Bar Chart
  const vendorData = {};
  documents.forEach((doc) => {
    const vendor = doc.vendor_name;
    const amount = parseFloat(doc.amount || 0);
    if (vendorData[vendor]) {
      vendorData[vendor] += amount;
    } else {
      vendorData[vendor] = amount;
    }
  });
  const vendorChartData = Object.entries(vendorData)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Data for Monthly Trend Line Chart
  const monthlyData = {};
  documents.forEach((doc) => {
    const date = new Date(doc.date);
    const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
    const amount = parseFloat(doc.amount || 0);
    if (monthlyData[monthYear]) {
      monthlyData[monthYear] += amount;
    } else {
      monthlyData[monthYear] = amount;
    }
  });
  const monthlyChartData = Object.entries(monthlyData)
    .map(([month, amount]) => ({ month, amount }))
    .slice(-6);

  // Data for Document Type Pie Chart
  const invoiceCount = documents.filter(
    (d) => d.document_type === "invoice",
  ).length;
  const creditNoteCount = documents.filter(
    (d) => d.document_type === "credit_note",
  ).length;
  const typeData = [
    { name: "Invoices", value: invoiceCount, color: "#3b82f6" },
    { name: "Credit Notes", value: creditNoteCount, color: "#8b5cf6" },
  ].filter((item) => item.value > 0);

  // Filter documents for table
  const filteredDocs = documents.filter((doc) => {
    if (filterStatus !== "all" && doc.status !== filterStatus) return false;
    if (filterVendor && doc.vendor_name !== filterVendor) return false;
    return true;
  });

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "pending_reviewer":
        return "Pending Reviewer";
      case "pending_manager":
        return "Pending Manager";
      case "pending_finance":
        return "Pending Finance";
      default:
        return status;
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>
          Reports & Analytics
        </h1>
        <p style={{ color: "#6b7280", marginTop: "4px" }}>
          Visual insights and detailed reports of your documents
        </p>
      </div>

      {/* Summary Cards */}
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
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Total Documents</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>
            {loading ? "..." : totalDocuments}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Approved</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981" }}>
            {loading ? "..." : totalApproved}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #e5e7eb",
          }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Pending</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b" }}>
            {loading ? "..." : totalPending}
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
            Total Value (Approved)
          </p>
          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937" }}>
            R {loading ? "..." : totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "24px",
        }}>
        {/* Status Distribution Pie Chart */}
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
            📊 Document Status Distribution
          </h3>
          {loading ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              Loading...
            </p>
          ) : statusData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Document Type Distribution */}
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
            📄 Document Type Breakdown
          </h3>
          {loading ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              Loading...
            </p>
          ) : typeData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value">
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "24px",
        }}>
        {/* Monthly Spending Trend */}
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
            📈 Monthly Spending Trend
          </h3>
          {loading ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              Loading...
            </p>
          ) : monthlyChartData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `R ${value.toLocaleString()}`,
                    "Amount",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Vendors Bar Chart */}
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
            🏢 Top Vendors by Spend
          </h3>
          {loading ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              Loading...
            </p>
          ) : vendorChartData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}>
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `R${value.toLocaleString()}`}
                />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip
                  formatter={(value) => [
                    `R ${value.toLocaleString()}`,
                    "Total Spend",
                  ]}
                />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "24px",
          border: "1px solid #e5e7eb",
        }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "#1f2937",
          }}>
          🔍 Filters
        </h3>
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
            }}>
            <option value="all">All Status</option>
            <option value="pending_reviewer">Pending Reviewer</option>
            <option value="pending_manager">Pending Manager</option>
            <option value="pending_finance">Pending Finance</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
            }}>
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFilterStatus("all");
              setFilterVendor("");
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              backgroundColor: "#f3f4f6",
              cursor: "pointer",
            }}>
            Clear Filters
          </button>

          <div
            style={{ marginLeft: "auto", fontSize: "12px", color: "#6b7280" }}>
            Showing {filteredDocs.length} of {documents.length} documents
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          overflow: "auto",
        }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{
              backgroundColor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}>
            <tr>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                Type
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                Vendor
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                Invoice #
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                Date
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "right",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                Amount
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}>
                  Loading...
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}>
                  No documents found
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px" }}>
                    {doc.document_type === "invoice"
                      ? "📄 Invoice"
                      : "📝 Credit Note"}
                  </td>
                  <td style={{ padding: "12px", color: "#1f2937" }}>
                    {doc.vendor_name}
                  </td>
                  <td style={{ padding: "12px", color: "#1f2937" }}>
                    {doc.invoice_number}
                  </td>
                  <td style={{ padding: "12px", color: "#1f2937" }}>
                    {doc.date}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: "#1f2937",
                    }}>
                    R {parseFloat(doc.amount).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
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
                      {getStatusText(doc.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
