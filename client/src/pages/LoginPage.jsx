import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlineEye,
  HiOutlineEyeOff,
} from "react-icons/hi";
import kimsLogo from "../assets/kims-logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "var(--login-page-bg)",
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full animate-float-slow"
          style={{
            background: "var(--login-orb-teal)",
          }}
        ></div>
        <div
          className="absolute bottom-[20%] right-[15%] w-[350px] h-[350px] rounded-full animate-float"
          style={{
            background: "var(--login-orb-blue)",
            animationDelay: "2s",
          }}
        ></div>
        <div
          className="absolute top-[60%] left-[60%] w-[250px] h-[250px] rounded-full animate-float-slow"
          style={{
            background: "var(--login-orb-violet)",
            animationDelay: "4s",
          }}
        ></div>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "var(--login-grid)",
          backgroundSize: "40px 40px",
        }}
      ></div>

      <div className="w-full max-w-[420px] relative z-10 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-5">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center relative overflow-hidden p-2"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 8px 32px rgba(15,23,42,0.28)",
                border: "1px solid rgba(148,163,184,0.3)",
              }}
            >
              <img
                src={kimsLogo}
                alt="KIMS logo"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Pulse ring behind logo */}
            <div
              className="absolute inset-0 rounded-2xl animate-pulse-ring"
              style={{ border: "2px solid rgba(20,184,166,0.3)" }}
            ></div>
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            Emergency Dashboard
          </h1>
          <p className="text-text-muted mt-2 text-sm tracking-wide">
            Hospital Duty Roster Management
          </p>
        </div>

        {/* Login Card */}
        <div
          className="glass rounded-2xl p-8 animate-border-glow"
          style={{
            boxShadow: "var(--login-card-shadow)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Username
              </label>
              <div className="relative group">
                <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-light transition-colors" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-bg-card/60 border border-border rounded-xl pl-11 pr-4 py-3.5 text-text-primary placeholder-text-muted/50 text-sm transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-light transition-colors" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-bg-card/60 border border-border rounded-xl pl-11 pr-12 py-3.5 text-text-primary placeholder-text-muted/50 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                >
                  {showPassword ? (
                    <HiOutlineEyeOff className="w-5 h-5" />
                  ) : (
                    <HiOutlineEye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <HiOutlineLockClosed className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted/40 text-xs mt-6">
          &copy; {new Date().getFullYear()} KIMS HOSPITAL. All rights reserved
        </p>
      </div>
    </div>
  );
}
