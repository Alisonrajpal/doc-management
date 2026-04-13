import { useState, useEffect } from "react";

export default function AIStatus() {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  // Use production backend URL directly
  const BACKEND_URL = "https://doc-mgmt-backend-tgcs.onrender.com";

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      // Set a longer timeout for cold starts (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(`${BACKEND_URL}/`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setStatus("online");
        setMessage(data.message || "Backend ready");
      } else {
        setStatus("offline");
        setMessage("Backend not responding");
      }
    } catch (error) {
      console.log("Backend waking up...");
      setStatus("checking");
      setMessage("Waking up backend...");
      
      // Retry after 5 seconds (for cold start)
      setTimeout(() => {
        checkAIStatus();
      }, 5000);
    }
  };

  const getStatusColor = () => {
    if (status === "online") return "#10b981";
    if (status === "checking") return "#f59e0b";
    return "#ef4444";
  };
  
  const getStatusText = () => {
    if (status === "online") return "Online";
    if (status === "checking") return "Waking...";
    return "Simulation Mode";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        backgroundColor: "#f3f4f6",
        borderRadius: "20px",
        fontSize: "12px",
      }}>
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: getStatusColor(),
          animation: status === "online" ? "pulse 2s infinite" : "none",
        }}
      />
      <span style={{ color: "#374151" }}>
        🤖 AI: <span style={{ fontWeight: "500" }}>{getStatusText()}</span>
      </span>
      <span style={{ color: "#6b7280", fontSize: "10px" }}>{message}</span>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
