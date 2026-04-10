import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Get user role from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        localStorage.setItem("userRole", profile?.role || "viewer");
        localStorage.setItem("userId", user.id);
        localStorage.setItem("userName", profile?.full_name || user.email);
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("tempAuth", "false");

        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .single();

      localStorage.setItem("userRole", profile?.role || "viewer");
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userName", profile?.full_name || data.user.email);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("tempAuth", "false");

      setLoading(false);
      navigate("/dashboard");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: email.split("@")[0],
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setMessage("Account created! You can now sign in.");
      setIsSignUp(false);
      setPassword("");
      setLoading(false);
    }
  };

  // Test accounts for quick login
  const testAccounts = [
    { email: "admin@example.com", role: "Admin" },
    { email: "reviewer@example.com", role: "Reviewer" },
    { email: "manager@example.com", role: "Manager" },
    { email: "finance@example.com", role: "Finance/Admin" },
    { email: "viewer@example.com", role: "Viewer" },
  ];

  const fillTestAccount = (email) => {
    setEmail(email);
    setPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-96 shadow-2xl border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          {isSignUp ? "Create Account" : "Document Manager"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50">
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
              setEmail("");
              setPassword("");
            }}
            className="text-white/60 hover:text-white text-sm transition">
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>

        {!isSignUp && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/60 text-sm text-center mb-3">
              Test Accounts (use password you set)
            </p>
            <div className="space-y-2">
              {testAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => fillTestAccount(account.email)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-sm transition">
                  {account.role}: {account.email}
                </button>
              ))}
            </div>
            <p className="text-white/40 text-xs text-center mt-3">
              Passwords: Admin123!, Review123!, Manager123!, Finance123!,
              Viewer123!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
