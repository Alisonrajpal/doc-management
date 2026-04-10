import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Workflow from "./pages/Workflow";
import Reports from "./pages/Reports";
import Insights from "./pages/Insights";
import Layout from "./components/Layout";

function App() {
  // Wake up backend on page load (prevents first-request timeout on Render free tier)
  useEffect(() => {
    const wakeBackend = async () => {
      try {
        const response = await fetch(
          "https://doc-mgmt-backend-tgcs.onrender.com",
        );
        console.log("Backend awake:", response.status);
      } catch (e) {
        console.log("Backend waking up...");
      }
    };
    wakeBackend();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
