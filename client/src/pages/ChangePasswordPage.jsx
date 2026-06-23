import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineArrowLeft,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import kimsLogo from "../assets/kims-logo.png";

export default function ChangePasswordPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const isMandatory = user?.mustChangePassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setLoading(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully");
      
      // Update local auth context state
      updateUser({ mustChangePassword: false });
      
      // Navigate back to home
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "var(--login-page-bg)",
      }}
    >
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[10%] left-[15%] w-[400px] h-[400px] rounded-full opacity-[0.4] animate-float-slow"
          style={{ background: "var(--login-orb-teal)" }}
        ></div>
        <div
          className="absolute bottom-[10%] right-[15%] w-[350px] h-[350px] rounded-full opacity-[0.4] animate-float"
          style={{ background: "var(--login-orb-blue)", animationDelay: "2s" }}
        ></div>
      </div>

      <div className="w-full max-w-[460px] relative z-10 animate-scale-in">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="relative inline-flex mb-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden p-2"
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
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Change Password
          </h1>
          {isMandatory && (
            <p className="text-danger text-xs font-semibold mt-2 px-4 py-1.5 bg-danger/10 border border-danger/20 rounded-lg inline-block">
              Temporary password detected. Please change your password to continue.
            </p>
          )}
        </div>

        {/* Change Password Card */}
        <div
          className="glass rounded-2xl p-6 md:p-8 border border-border"
          style={{
            boxShadow: "var(--login-card-shadow)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Old Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Old Password <span className="text-danger">*</span>
              </label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted group-focus-within:text-primary-light transition-colors" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter old password"
                  className="w-full bg-bg-card/60 border border-border rounded-xl pl-10 pr-10 py-2.5 text-text-primary placeholder-text-muted/50 text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                >
                  {showCurrent ? (
                    <HiOutlineEyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <HiOutlineEye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                New Password <span className="text-danger">*</span>
              </label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted group-focus-within:text-primary-light transition-colors" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-bg-card/60 border border-border rounded-xl pl-10 pr-10 py-2.5 text-text-primary placeholder-text-muted/50 text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                >
                  {showNew ? (
                    <HiOutlineEyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <HiOutlineEye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Confirm New Password <span className="text-danger">*</span>
              </label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted group-focus-within:text-primary-light transition-colors" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-bg-card/60 border border-border rounded-xl pl-10 pr-10 py-2.5 text-text-primary placeholder-text-muted/50 text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                >
                  {showConfirm ? (
                    <HiOutlineEyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <HiOutlineEye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Instructions Section */}
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
                Password Instructions
              </p>
              <ul className="text-[11px] text-red-300/80 list-disc list-inside space-y-0.5 pl-0.5">
                <li>Must be at least 6 characters long</li>
                <li>Should differ from your current password</li>
                <li>Avoid using simple words or sequential numbers</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.2)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.filter = "brightness(1.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = "none";
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Save"
                )}
              </button>

              {isMandatory ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-transparent hover:bg-white/5 border border-border text-text-secondary py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  Cancel & Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full bg-transparent hover:bg-white/5 border border-border text-text-secondary py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <HiOutlineArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
