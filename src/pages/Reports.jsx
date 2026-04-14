import React, { useState, useEffect } from "react";
import { getDocuments } from "../lib/supabase";
import { supabase } from "../lib/supabase";
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
  const [approvals, setApprovals] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [vendors, setVendors] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showVATReport, setShowVATReport] = useState(false);

  const userRole = localStorage.getItem("userRole") || "viewer";

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await getDocuments();
    setDocuments(docs);
    
    await loadApprovals(docs);
    
    const uniqueVendors = [...new Set(docs.map((doc) => doc.vendor_name).filter(Boolean))];
    setVendors(uniqueVendors);
    setLoading(false);
  };

  const loadApprovals = async (docs) => {
    const approvalsMap = {};
    for (const doc of docs) {
      const { data } = await supabase.from("approvals").select("*").eq("document_id", doc.id).order("step", { ascending: true });
      if (data && data.length > 0) approvalsMap[doc.id] = data;
    }
    setApprovals(approvalsMap);
  };

  // Filter by date
  const filterByDate = (doc) => {
    if (!filterStartDate && !filterEndDate) return true;
    const docDate = new Date(doc.date);
    if (filterStartDate && new Date(filterStartDate) > docDate) return false;
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59);
      if (endDate < docDate) return false;
    }
    return true;
  };

  // Apply all filters
  const filteredDocs = documents.filter((doc) => {
    if (filterStatus !== "all" && doc.status !== filterStatus) return false;
    if (filterVendor && doc.vendor_name !== filterVendor) return false;
    if (!filterByDate(doc)) return false;
    return true;
  });

  // Summary stats
  const totalDocuments = filteredDocs.length;
  const totalApproved = filteredDocs.filter((d) => d.status === "approved").length;
  const totalPending = filteredDocs.filter((d) => d.status !== "approved" && d.status !== "rejected").length;
  const totalRejected = filteredDocs.filter((d) => d.status === "rejected").length;
  const totalAmount = filteredDocs.filter((d) => d.status === "approved").reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const totalVAT = filteredDocs.filter((d) => d.status === "approved").reduce((sum, d) => sum + parseFloat(d.vat || 0), 0);

  // Status pie chart data
  const statusData = [
    { name: "Approved", value: totalApproved, color: "#10b981" },
    { name: "Pending", value: totalPending, color: "#f59e0b" },
    { name: "Rejected", value: totalRejected, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  // Vendor bar chart data
  const vendorData = {};
  filteredDocs.forEach((doc) => {
    const vendor = doc.vendor_name;
    const amount = parseFloat(doc.amount || 0);
    vendorData[vendor] = (vendorData[vendor] || 0) + amount;
  });
  const vendorChartData = Object.entries(vendorData).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);

  // Monthly trend data
  const monthlyData = {};
  filteredDocs.forEach((doc) => {
    const date = new Date(doc.date);
    const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
    const amount = parseFloat(doc.amount || 0);
    monthlyData[monthYear] = (monthlyData[monthYear] || 0) + amount;
  });
  const monthlyChartData = Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })).slice(-6);

  // Document type pie chart data
  const invoiceCount = filteredDocs.filter((d) => d.document_type === "invoice").length;
  const creditNoteCount = filteredDocs.filter((d) => d.document_type === "credit_note").length;
  const typeData = [
    { name: "Invoices", value: invoiceCount, color: "#3b82f6" },
    { name: "Credit Notes", value: creditNoteCount, color: "#8b5cf6" },
  ].filter((item) => item.value > 0);

  // Spend summary by vendor
  const spendSummaryByVendor = Object.entries(vendorData).map(([vendor, amount]) => ({ vendor, amount: amount.toFixed(2) })).sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

  // VAT report data
  const vatReportData = filteredDocs.filter((doc) => doc.status === "approved").map((doc) => ({
    vendor: doc.vendor_name,
    invoice_number: doc.invoice_number,
    amount: parseFloat(doc.amount || 0).toFixed(2),
    vat: parseFloat(doc.vat || 0).toFixed(2),
    total: (parseFloat(doc.amount || 0) + parseFloat(doc.vat || 0)).toFixed(2),
    date: doc.date,
  }));

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Vendor", "Invoice #", "Date", "Amount", "VAT", "Status", "Type"];
    const rows = filteredDocs.map((doc) => [doc.vendor_name, doc.invoice_number, doc.date, parseFloat(doc.amount || 0).toFixed(2), parseFloat(doc.vat || 0).toFixed(2), doc.status, doc.document_type]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF (print)
  const exportToPDF = () => window.print();

  const getStatusText = (status) => {
    switch (status) {
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      case "pending_reviewer": return "Pending Reviewer";
      case "pending_manager": return "Pending Manager";
      case "pending_finance": return "Pending Finance";
      default: return status;
    }
  };

  const getStepStatus = (step, documentStatus, approvalsList) => {
    const approved = approvalsList?.find(a => a.step === step && a.status === "approved");
    if (approved) return { status: "approved", by: approved.approved_by, at: approved.approved_at };
    const rejected = approvalsList?.find(a => a.step === step && a.status === "rejected");
    if (rejected) return { status: "rejected", by: rejected.approved_by, at: rejected.approved_at };
    if (documentStatus === "pending_reviewer" && step === 1) return { status: "pending" };
    if (documentStatus === "pending_manager" && step === 2) return { status: "pending" };
    if (documentStatus === "pending_finance" && step === 3) return { status: "pending" };
    if (documentStatus === "approved" && step <= 3) return { status: "approved" };
    if (documentStatus === "rejected") {
      if (approvalsList?.find(a => a.step === step && a.status === "rejected")) return { status: "rejected" };
      if (approvalsList?.find(a => a.step < step && a.status === "rejected")) return { status: "blocked" };
    }
    return { status: "pending" };
  };

  const getStepName = (step) => {
    switch (step) { case 1: return "Reviewer"; case 2: return "Manager"; case 3: return "Finance/Admin"; default: return `Step ${step}`; }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const toggleRow = (docId) => setExpandedRow(expandedRow === docId ? null : docId);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterVendor("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }} className="print-friendly">
      <style>{`
        @media print {
          .no-print { display: none; }
          .print-friendly { padding: 0; margin: 0; }
          .print-friendly .chart-container { break-inside: avoid; }
        }
      `}</style>
      
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>Reports & Analytics</h1>
        <p style={{ color: "#6b7280", marginTop: "4px" }}>Visual insights and detailed reports of your documents</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Total Documents</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937" }}>{loading ? "..." : totalDocuments}</p>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Approved</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981" }}>{loading ? "..." : totalApproved}</p>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Pending</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b" }}>{loading ? "..." : totalPending}</p>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>Total Value</p>
          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937" }}>R {loading ? "..." : totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", marginBottom: "24px", border: "1px solid #e5e7eb" }} className="no-print">
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#1f2937" }}>🔍 Filters</h3>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white" }}>
            <option value="all">All Status</option>
            <option value="pending_reviewer">Pending Reviewer</option>
            <option value="pending_manager">Pending Manager</option>
            <option value="pending_finance">Pending Finance</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white" }}>
            <option value="">All Vendors</option>
            {vendors.map((v) => (<option key={v} value={v}>{v}</option>))}
          </select>
          <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
          <span>to</span>
          <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
          <button onClick={clearFilters} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#f3f4f6", cursor: "pointer" }}>Clear</button>
          <button onClick={exportToCSV} style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#10b981", color: "white", border: "none", cursor: "pointer" }}>📊 Export CSV</button>
          <button onClick={exportToPDF} style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#3b82f6", color: "white", border: "none", cursor: "pointer" }}>🖨️ Export PDF</button>
          <button onClick={() => setShowVATReport(!showVATReport)} style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: showVATReport ? "#8b5cf6" : "#6b7280", color: "white", border: "none", cursor: "pointer" }}>💰 VAT Report</button>
        </div>
      </div>

      {/* Spend Summary by Vendor */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", marginBottom: "24px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>💰 Spend Summary by Vendor</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}><th style={{ textAlign: "left", padding: "8px" }}>Vendor</th><th style={{ textAlign: "right", padding: "8px" }}>Total Spend (R)</th></tr></thead>
            <tbody>
              {spendSummaryByVendor.map((item) => (<tr key={item.vendor}><td style={{ padding: "8px" }}>{item.vendor}</td><td style={{ padding: "8px", textAlign: "right" }}>R {parseFloat(item.amount).toLocaleString()}</td></tr>))}
              {spendSummaryByVendor.length === 0 && (<tr><td colSpan="2" style={{ padding: "20px", textAlign: "center" }}>No data</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* VAT Report Section */}
      {showVATReport && (
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", marginBottom: "24px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>📋 VAT / Tax Report</h3>
          <div style={{ marginBottom: "16px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "8px", flex: 1 }}><p style={{ fontSize: "12px" }}>Total VAT</p><p style={{ fontSize: "24px", fontWeight: "bold" }}>R {totalVAT.toLocaleString()}</p></div>
            <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "8px", flex: 1 }}><p style={{ fontSize: "12px" }}>Taxable Amount</p><p style={{ fontSize: "24px", fontWeight: "bold" }}>R {totalAmount.toLocaleString()}</p></div>
            <div style={{ backgroundColor: "#fef3c7", padding: "12px", borderRadius: "8px", flex: 1 }}><p style={{ fontSize: "12px" }}>Avg VAT Rate</p><p style={{ fontSize: "24px", fontWeight: "bold" }}>{totalAmount > 0 ? ((totalVAT / totalAmount) * 100).toFixed(1) : 0}%</p></div>
          </div>
          <div style={{ overflowX: "auto", maxHeight: "400px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ textAlign: "left", padding: "8px" }}>Vendor</th><th style={{ textAlign: "left", padding: "8px" }}>Invoice #</th><th style={{ textAlign: "left", padding: "8px" }}>Date</th><th style={{ textAlign: "right", padding: "8px" }}>Amount</th><th style={{ textAlign: "right", padding: "8px" }}>VAT</th><th style={{ textAlign: "right", padding: "8px" }}>Total</th></tr></thead>
              <tbody>
                {vatReportData.map((doc, idx) => (<tr key={idx}><td>{doc.vendor}</td><td>{doc.invoice_number}</td><td>{doc.date}</td><td style={{ textAlign: "right" }}>R {parseFloat(doc.amount).toLocaleString()}</td><td style={{ textAlign: "right" }}>R {parseFloat(doc.vat).toLocaleString()}</td><td style={{ textAlign: "right" }}>R {parseFloat(doc.total).toLocaleString()}</td></tr>))}
                {vatReportData.length === 0 && (<tr><td colSpan="6" style={{ padding: "20px", textAlign: "center" }}>No approved documents with VAT</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", marginBottom: "24px" }} className="chart-container">
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>📊 Document Status Distribution</h3>
          {loading ? (<p style={{ textAlign: "center", padding: "40px" }}>Loading...</p>) : statusData.length === 0 ? (<p style={{ textAlign: "center", padding: "40px" }}>No data</p>) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">{statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>📄 Document Type Breakdown</h3>
          {loading ? (<p style={{ textAlign: "center", padding: "40px" }}>Loading...</p>) : typeData.length === 0 ? (<p style={{ textAlign: "center", padding: "40px" }}>No data</p>) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={typeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">{typeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", marginBottom: "24px" }} className="chart-container">
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>📈 Monthly Spending Trend</h3>
          {loading ? (<p style={{ textAlign: "center", padding: "40px" }}>Loading...</p>) : monthlyChartData.length === 0 ? (<p style={{ textAlign: "center", padding: "40px" }}>No data</p>) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => [`R ${value.toLocaleString()}`, "Amount"]} /><Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#93c5fd" /></AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>🏢 Top Vendors by Spend</h3>
          {loading ? (<p style={{ textAlign: "center", padding: "40px" }}>Loading...</p>) : vendorChartData.length === 0 ? (<p style={{ textAlign: "center", padding: "40px" }}>No data</p>) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => `R${value.toLocaleString()}`} /><YAxis type="category" dataKey="name" width={100} /><Tooltip formatter={(value) => [`R ${value.toLocaleString()}`, "Total Spend"]} /><Bar dataKey="amount" fill="#10b981" /></BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr><th style={{ width: "30px", padding: "12px" }}></th><th style={{ padding: "12px", textAlign: "left" }}>Type</th><th style={{ padding: "12px", textAlign: "left" }}>Vendor</th><th style={{ padding: "12px", textAlign: "left" }}>Document #</th><th style={{ padding: "12px", textAlign: "left" }}>Date</th><th style={{ padding: "12px", textAlign: "right" }}>Amount</th><th style={{ padding: "12px", textAlign: "center" }}>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan="7" style={{ padding: "48px", textAlign: "center" }}>Loading...</td></tr>) : filteredDocs.length === 0 ? (<tr><td colSpan="7" style={{ padding: "48px", textAlign: "center" }}>No documents found</td></tr>) : (
              filteredDocs.map((doc) => {
                const approvalsList = approvals[doc.id];
                return (
                  <React.Fragment key={doc.id}>
                    <tr style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                      <td style={{ padding: "12px", textAlign: "center" }}><button onClick={() => toggleRow(doc.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>{expandedRow === doc.id ? "▼" : "▶"}</button></td>
                      <td style={{ padding: "12px" }}>{doc.document_type === "invoice" ? "📄 Invoice" : "📝 Credit Note"}</td>
                      <td style={{ padding: "12px" }}>{doc.vendor_name}</td>
                      <td style={{ padding: "12px" }}>{doc.invoice_number}</td>
                      <td style={{ padding: "12px" }}>{doc.date}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>R {parseFloat(doc.amount).toLocaleString()}</td>
                      <td style={{ padding: "12px", textAlign: "center" }}><span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "12px", backgroundColor: doc.status === "approved" ? "#d1fae5" : doc.status === "rejected" ? "#fee2e2" : "#fef3c7", color: doc.status === "approved" ? "#065f46" : doc.status === "rejected" ? "#991b1b" : "#92400e" }}>{getStatusText(doc.status)}</span></td>
                    </tr>
                    {expandedRow === doc.id && (
                      <tr><td colSpan="7" style={{ padding: "16px", backgroundColor: "#f9fafb" }}>
                        <div style={{ borderLeft: "3px solid #e5e7eb", paddingLeft: "20px" }}>
                          <h4>Approval Timeline</h4>
                          {[1, 2, 3].map((step) => {
                            const stepStatus = getStepStatus(step, doc.status, approvalsList);
                            return (<div key={step} style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                              <div style={{ width: "120px" }}>Step {step}: {getStepName(step)}</div>
                              <div>{stepStatus.status === "approved" && <span>✅ Approved on {formatDate(stepStatus.at)}</span>}{stepStatus.status === "rejected" && <span>❌ Rejected on {formatDate(stepStatus.at)}</span>}{stepStatus.status === "pending" && <span>⏳ Pending</span>}{stepStatus.status === "blocked" && <span>🚫 Blocked</span>}</div>
                            </div>);
                          })}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
