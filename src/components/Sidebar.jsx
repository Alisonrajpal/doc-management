import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Upload,
  GitBranch,
  BarChart3,
  Lightbulb,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Circle,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { supabase } from "../lib/supabase";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState({ name: "", email: "", role: "" });
  const navigate = useNavigate();

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    // Check if using Supabase auth
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authUser.id)
        .single();

      setUser({
        name: profile?.full_name || authUser.email?.split("@")[0] || "User",
        email: authUser.email || "",
        role: profile?.role || "viewer",
      });
      return;
    }

    // Fallback to temp auth
    if (localStorage.getItem("tempAuth") === "true") {
      setUser({
        name: localStorage.getItem("userName") || "Test User",
        email: localStorage.getItem("userEmail") || "test@test.com",
        role: localStorage.getItem("userRole") || "viewer",
      });
      return;
    }

    // Default guest
    setUser({
      name: "Guest",
      email: "guest@test.com",
      role: "viewer",
    });
  };

  const handleSignOut = async () => {
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear all auth data
    localStorage.removeItem("tempAuth");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    // Navigate to sign in page
    navigate("/");

    // Force reload to clear any cached state
    window.location.reload();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "text-red-400";
      case "reviewer":
        return "text-purple-400";
      case "manager":
        return "text-blue-400";
      case "finance_admin":
        return "text-yellow-400";
      case "viewer":
        return "text-green-400";
      default:
        return "text-white/60";
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 border-red-500/50";
      case "reviewer":
        return "bg-purple-500/20 border-purple-500/50";
      case "manager":
        return "bg-blue-500/20 border-blue-500/50";
      case "finance_admin":
        return "bg-yellow-500/20 border-yellow-500/50";
      case "viewer":
        return "bg-green-500/20 border-green-500/50";
      default:
        return "bg-white/10 border-white/20";
    }
  };

  const displayRole = (role) => {
    if (role === "finance_admin") return "Finance/Admin";
    return role;
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/upload", label: "Upload", icon: Upload },
    { path: "/workflow", label: "Workflow", icon: GitBranch },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/insights", label: "Insights", icon: Lightbulb },
  ];

  return (
    <div
      className={`relative bg-gradient-to-b from-blue-800 via-indigo-900 to-blue-950 backdrop-blur-sm border-r border-white/20 transition-all duration-300 flex flex-col shrink-0 ${
        isCollapsed ? "w-20" : "w-64"
      }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-indigo-600 hover:bg-indigo-700 rounded-full p-1 border-2 border-white/20 transition z-10">
        {isCollapsed ? (
          <ChevronRight size={18} className="text-white" />
        ) : (
          <ChevronLeft size={18} className="text-white" />
        )}
      </button>

      {/* Logo */}
      <div
        className={`p-6 border-b border-white/10 ${isCollapsed ? "px-4" : ""}`}>
        {!isCollapsed ? (
          <h2 className="text-xl font-bold text-white">Doc Management</h2>
        ) : (
          <h2 className="text-xl font-bold text-white text-center">D</h2>
        )}
      </div>

      {/* Notification Bell - Added here */}
      <div
        className={`px-4 py-2 ${isCollapsed ? "px-2 flex justify-center" : ""}`}>
        <NotificationBell />
      </div>

      {/* User Profile Section */}
      <div
        className={`p-4 border-b border-white/10 ${isCollapsed ? "px-2" : ""}`}>
        <div
          className={`flex items-center gap-3 ${
            isCollapsed ? "justify-center" : ""
          }`}>
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${
              isCollapsed ? "mx-auto" : ""
            }`}>
            <User size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{user.name}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div
            className={`mt-3 px-3 py-1 rounded-full border ${getRoleBadge(
              user.role,
            )} inline-block`}>
            <div className="flex items-center gap-1">
              <Circle
                size={8}
                className={`fill-current ${getRoleColor(user.role)}`}
              />
              <span
                className={`text-xs font-medium ${getRoleColor(
                  user.role,
                )} capitalize`}>
                {displayRole(user.role)}
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mt-2 flex justify-center">
            <div
              className={`w-6 h-6 rounded-full border ${getRoleBadge(
                user.role,
              )} flex items-center justify-center`}>
              <Circle
                size={8}
                className={`fill-current ${getRoleColor(user.role)}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition ${
                isActive ? "bg-white/20 text-white" : ""
              } ${isCollapsed ? "justify-center" : ""}`
            }
            title={isCollapsed ? item.label : ""}>
            <item.icon size={20} />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-white/10 mt-auto">
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-3 px-4 py-2 w-full rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Sign Out" : ""}>
          <LogOut size={20} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
