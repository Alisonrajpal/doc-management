import { useState, useEffect } from "react";

export default function AIStatus() {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await fetch("http://localhost:8000/");
      if (response.ok) {
        const data = await response.json();
        setStatus("online");
        // Display whatever model the backend says it's using
        setMessage(data.message || "Backend ready");
      } else {
        setStatus("offline");
        setMessage("Backend not responding");
      }
    } catch (error) {
      setStatus("offline");
      setMessage("Backend offline - using simulation");
    }
  };

  const getStatusColor = () => (status === "online" ? "#10b981" : "#f59e0b");
  const getStatusText = () =>
    status === "online" ? "Online" : "Simulation Mode";

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
