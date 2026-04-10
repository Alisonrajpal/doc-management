import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Workflow from "./pages/Workflow";
import Reports from "./pages/Reports";
import Insights from "./pages/Insights";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/upload"
          element={
            <Layout>
              <Upload />
            </Layout>
          }
        />
        <Route
          path="/workflow"
          element={
            <Layout>
              <Workflow />
            </Layout>
          }
        />
        <Route
          path="/reports"
          element={
            <Layout>
              <Reports />
            </Layout>
          }
        />
        <Route
          path="/insights"
          element={
            <Layout>
              <Insights />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
