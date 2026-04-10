import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
      }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: "32px",
          overflow: "auto",
          backgroundColor: "#f9fafb",
          marginLeft: 0,
        }}>
        {children}
      </main>
    </div>
  );
}
