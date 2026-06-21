import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineDownload,
} from "react-icons/hi";

const statCardConfig = [
  {
    key: "totalStaff",
    icon: HiOutlineUsers,
    label: "Active Staff",
    gradient:
      "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.03))",
    iconBg: "rgba(20,184,166,0.15)",
    iconColor: "#14B8A6",
    borderColor: "rgba(20,184,166,0.15)",
  },
  {
    key: "todayRosterCount",
    icon: HiOutlineCalendar,
    label: "Today's Roster",
    gradient:
      "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03))",
    iconBg: "rgba(245,158,11,0.15)",
    iconColor: "#F59E0B",
    borderColor: "rgba(245,158,11,0.15)",
  },
  {
    key: "totalCertificates",
    icon: HiOutlineDocumentText,
    label: "Certificates",
    gradient:
      "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.03))",
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3B82F6",
    borderColor: "rgba(59,130,246,0.15)",
  },
  {
    key: "expiringCertificates",
    icon: HiOutlineExclamation,
    label: "Expiring Soon",
    gradient:
      "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.03))",
    iconBg: "rgba(239,68,68,0.15)",
    iconColor: "#EF4444",
    borderColor: "rgba(239,68,68,0.15)",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  const fetchStats = useCallback(async (start = startDate, end = endDate) => {
    try {
      const res = await api.get(`/display/dashboard-stats?startDate=${start}&endDate=${end}`);
      setStats(res.data.stats);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate, fetchStats]);

  const handleExportExcel = async () => {
    try {
      const response = await api.get(
        `/display/audit-logs/export?startDate=${startDate}&endDate=${endDate}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Audit_Logs_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to export excel:", err);
    }
  };

  const isLightTheme =
    document.documentElement.getAttribute("data-theme") === "light";
  const dashboardRowStyle = isLightTheme
    ? {
        background: "rgba(226, 232, 240, 0.78)",
        border: "1px solid rgba(148, 163, 184, 0.35)",
      }
    : {
        background: "rgba(11,17,32,0.4)",
      };

  const dashboardWarnRowStyle = isLightTheme
    ? {
        background: "rgba(255, 255, 255, 0.88)",
        border: "1px solid rgba(249,115,22,0.22)",
      }
    : {
        background: "rgba(11,17,32,0.4)",
        border: "1px solid rgba(249,115,22,0.1)",
      };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div
            className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: "rgba(20,184,166,0.2)",
              borderTopColor: "#14B8A6",
            }}
          ></div>
          <p className="text-text-muted text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-display font-bold text-text-primary">
          Dashboard
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Overview of casualty department operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCardConfig.map((card, i) => {
          const Icon = card.icon;
          const value = stats?.[card.key] || 0;
          return (
            <div
              key={card.key}
              className="rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-stagger-in group relative overflow-hidden"
              style={{
                background: card.gradient,
                border: `1px solid ${card.borderColor}`,
                animationDelay: `${i * 80}ms`,
              }}
            >
              {/* Shimmer overlay on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer pointer-events-none"></div>

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p
                    className="text-3xl font-display font-bold mt-1.5"
                    style={{ color: card.iconColor }}
                  >
                    {value}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: card.iconBg }}
                >
                  <Icon className="w-6 h-6" style={{ color: card.iconColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff by Category & Expiring Certs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff by Category */}
        <div
          className="glass-card rounded-xl p-6 animate-stagger-in"
          style={{ animationDelay: "350ms" }}
        >
          <h2 className="text-base font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.12)" }}
            >
              <HiOutlineUsers
                className="w-4 h-4"
                style={{ color: "#14B8A6" }}
              />
            </div>
            Staff by Category
          </h2>
          <div className="space-y-2.5">
            {stats?.staffByCategory?.map((cat, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-bg-card/50 group"
                style={dashboardRowStyle}
              >
                <span className="text-text-secondary text-sm group-hover:text-text-primary transition-colors">
                  {cat.category}
                </span>
                <span
                  className="text-text-primary font-semibold text-sm px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(20,184,166,0.1)",
                    color: "#14B8A6",
                  }}
                >
                  {cat.count}
                </span>
              </div>
            ))}
            {(!stats?.staffByCategory ||
              stats.staffByCategory.length === 0) && (
              <p className="text-text-muted text-sm text-center py-6">
                No staff data available
              </p>
            )}
          </div>
        </div>

        {/* Expiring Certificates */}
        <div
          className="glass-card rounded-xl p-6 animate-stagger-in"
          style={{ animationDelay: "400ms" }}
        >
          <h2 className="text-base font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.12)" }}
            >
              <HiOutlineExclamation
                className="w-4 h-4"
                style={{ color: "#F97316" }}
              />
            </div>
            Expiring Certificates
          </h2>
          {stats?.expiringCerts?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.expiringCerts.map((cert, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg transition-all duration-200"
                  style={dashboardWarnRowStyle}
                >
                  <div>
                    <p className="text-text-primary text-sm font-medium">
                      {cert.staff_name}
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {cert.certificate_type}
                    </p>
                  </div>
                  <span className="status-warning text-xs font-medium px-2.5 py-1 rounded-full">
                    {new Date(cert.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-6">
              No certificates expiring in the next 30 days ✓
            </p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {isSuperAdmin && (
        <div
          className="glass-card rounded-xl p-6 animate-stagger-in"
          style={{ animationDelay: "450ms" }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-border/20 pb-4">
            <h2 className="text-base font-display font-semibold text-text-primary flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(20,184,166,0.12)" }}
              >
                <HiOutlineClock className="w-4 h-4" style={{ color: "#14B8A6" }} />
              </div>
              Recent Activity
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs font-medium">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-bg-dark border border-border rounded-lg px-2.5 py-1.5 text-text-primary text-xs focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-bg-dark border border-border rounded-lg px-2.5 py-1.5 text-text-primary text-xs focus:outline-none"
                />
              </div>
              <button
                onClick={handleExportExcel}
                className="btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium"
                title="Export Logs to Excel"
              >
                <HiOutlineDownload className="w-3.5 h-3.5" /> Export Excel
              </button>
            </div>
          </div>

          {stats?.recentActivity?.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
              {stats.recentActivity.map((activity, i) => {
                const dotColors = {
                  CREATE: "#22C55E",
                  UPDATE: "#F59E0B",
                  DELETE: "#EF4444",
                };
                const dotColor = dotColors[activity.action] || "#64748B";
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-card/30 transition-all duration-200 group"
                  >
                    <div className="relative mt-1.5 shrink-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: dotColor }}
                      ></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm group-hover:text-text-primary transition-colors">
                        {activity.details}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {activity.user_name} •{" "}
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-6">
              No recent activity found for this period.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
