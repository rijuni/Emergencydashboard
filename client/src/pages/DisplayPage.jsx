import { useState, useEffect, useMemo, useRef } from "react";
import kimsLogo from "../assets/kims-logo.png";
import DoctorsDisplayPage from "./DoctorsDisplayPage";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";

export default function DisplayPage() {
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState("roster");
  const tickerRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  // Fetch display data
  const fetchData = async () => {
    try {
      const res = await fetch("/api/display/today");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error("Display fetch error:", err);
    }
  };

  // Clock update
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Data fetch + auto-refresh
  useEffect(() => {
    const initialLoad = setTimeout(() => {
      fetchData();
    }, 0);

    return () => clearTimeout(initialLoad);
  }, []);

  useEffect(() => {
    const refreshSeconds =
      parseInt(data?.settings?.auto_refresh_seconds, 10) || 30;
    const refreshInterval = setInterval(() => {
      fetchData();
    }, refreshSeconds * 1000);

    return () => clearInterval(refreshInterval);
  }, [data?.settings?.auto_refresh_seconds]);

  // Screen rotation interval
  useEffect(() => {
    const screenInterval = setInterval(() => {
      setActiveScreen(prev => prev === "roster" ? "onCallDoctors" : "roster");
    }, 10000);
    return () => clearInterval(screenInterval);
  }, []);

  // Get current shift
  const getCurrentShift = () => {
    if (!data?.shifts) return null;
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const shift of data.shifts) {
      const [sH, sM] = shift.start_time.split(":").map(Number);
      const [eH, eM] = shift.end_time.split(":").map(Number);
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;

      if (endMin < startMin) {
        if (currentMinutes >= startMin || currentMinutes < endMin)
          return shift.id;
      } else {
        if (currentMinutes >= startMin && currentMinutes < endMin)
          return shift.id;
      }
    }
    return null;
  };

  const currentShiftId = getCurrentShift();

  const getStaffForCell = (categoryName, shiftId) => {
    if (!data?.roster) return [];
    return data.roster.filter(
      (r) => r.category_name === categoryName && r.shift_id === shiftId && r.notes !== "ON_CALL",
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDay = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long" });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Static color configs — no dynamic Tailwind
  const shiftColors = {
    Morning: {
      bg: isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)",
      bgActive: isDark ? "rgba(245, 158, 11, 0.22)" : "rgba(245, 158, 11, 0.16)",
      border: isDark ? "rgba(245, 158, 11, 0.45)" : "rgba(245, 158, 11, 0.35)",
      text: "#F59E0B",
      glow: isDark ? "0 0 32px rgba(245, 158, 11, 0.25)" : "0 0 26px rgba(245, 158, 11, 0.12)",
    },
    Evening: {
      bg: isDark ? "rgba(139, 92, 246, 0.12)" : "rgba(139, 92, 246, 0.08)",
      bgActive: isDark ? "rgba(139, 92, 246, 0.22)" : "rgba(139, 92, 246, 0.16)",
      border: isDark ? "rgba(139, 92, 246, 0.45)" : "rgba(139, 92, 246, 0.35)",
      text: isDark ? "#A78BFA" : "#8B5CF6",
      glow: isDark ? "0 0 32px rgba(139, 92, 246, 0.25)" : "0 0 26px rgba(139, 92, 246, 0.12)",
    },
    Night: {
      bg: isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.08)",
      bgActive: isDark ? "rgba(59, 130, 246, 0.22)" : "rgba(59, 130, 246, 0.16)",
      border: isDark ? "rgba(59, 130, 246, 0.45)" : "rgba(59, 130, 246, 0.35)",
      text: isDark ? "#60A5FA" : "#3B82F6",
      glow: isDark ? "0 0 32px rgba(59, 130, 246, 0.25)" : "0 0 26px rgba(59, 130, 246, 0.12)",
    },
  };

  const shiftFallbacks = [
    {
      bg: "rgba(14, 165, 233, 0.08)",
      bgActive: "rgba(14, 165, 233, 0.16)",
      border: "rgba(14, 165, 233, 0.35)",
      text: "#0EA5E9",
      glow: "0 0 26px rgba(14, 165, 233, 0.12)",
    },
    {
      bg: "rgba(34, 197, 94, 0.08)",
      bgActive: "rgba(34, 197, 94, 0.16)",
      border: "rgba(34, 197, 94, 0.35)",
      text: "#22C55E",
      glow: "0 0 26px rgba(34, 197, 94, 0.12)",
    },
    {
      bg: "rgba(249, 115, 22, 0.08)",
      bgActive: "rgba(249, 115, 22, 0.16)",
      border: "rgba(249, 115, 22, 0.35)",
      text: "#F97316",
      glow: "0 0 26px rgba(249, 115, 22, 0.12)",
    },
    {
      bg: "rgba(225, 29, 72, 0.08)",
      bgActive: "rgba(225, 29, 72, 0.16)",
      border: "rgba(225, 29, 72, 0.35)",
      text: "#E11D48",
      glow: "0 0 26px rgba(225, 29, 72, 0.12)",
    },
    {
      bg: "rgba(139, 92, 246, 0.08)",
      bgActive: "rgba(139, 92, 246, 0.16)",
      border: "rgba(139, 92, 246, 0.35)",
      text: "#8B5CF6",
      glow: "0 0 26px rgba(139, 92, 246, 0.12)",
    },
  ];

  const getShiftColors = (shift, index) =>
    shiftColors[shift.name] || shiftFallbacks[index % shiftFallbacks.length];

  const ROSTER_CATEGORY_ALLOWLIST = [
    "Doctor",
    "Nursing Officer",
    "Pharmacist",
    "Technician",
    "Night Supervisor",
  ];
  const NIGHT_SUPERVISOR_NAME = "Night Supervisor";
  const NIGHT_SHIFT_NAME = "Night";
  const normalizeName = (value) => (value || "").trim().toLowerCase();

  const categoryColors = [
    "#14B8A6",
    "#3B82F6",
    "#A855F7",
    "#F59E0B",
    "#EF4444",
    "#22C55E",
    "#EC4899",
    "#6366F1",
  ];

  const displayCategories = useMemo(() => {
    const categories = data?.categories || [];
    return categories.filter((category) =>
      ROSTER_CATEGORY_ALLOWLIST.some(
        (name) => normalizeName(name) === normalizeName(category.name),
      ),
    );
  }, [data?.categories]);

  const ambulanceNumber = data?.settings?.ambulance_contact_number || "";
  const ambulanceDetails = data?.settings?.ambulance_contact_details || "";

  const securitySupervisors = useMemo(() => {
    return (data?.roster || []).filter(
      (entry) =>
        entry.category_name === "Security Supervisor" &&
        entry.shift_id === currentShiftId &&
        entry.notes !== "ON_CALL"
    );
  }, [data?.roster, currentShiftId]);
  const defaultSupervisorName = data?.settings?.security_supervisor_name || "MR. BASANTA KHAMARI";
  const securityNames = securitySupervisors.length > 0 
    ? securitySupervisors.map((s) => s.staff_name).join(" • ")
    : defaultSupervisorName;
  const nightSupervisorName = data?.nightSupervisorName || "NOT ASSIGNED";

  // Group on-call doctors by department
  const onCallDoctorsByDept = useMemo(() => {
    if (!data?.roster) return {};
    const doctors = data.roster.filter(r => 
      normalizeName(r.category_name) === "doctor" && r.shift_id === currentShiftId
    );
    const grouped = {};
    doctors.forEach(doc => {
      const dept = (doc.department || "Unassigned").trim().toUpperCase();
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(doc);
    });
    return grouped;
  }, [data?.roster, currentShiftId]);

  if (loading) {
    return (
      <div
        className="display-fullscreen flex items-center justify-center"
        style={{
          background: isDark ? "#060D1A" : "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
        }}
      >
        <div className="text-center animate-fade-in">
          <div
            className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: isDark ? "rgba(20,184,166,0.1)" : "rgba(15,118,110,0.2)",
              borderTopColor: "#14B8A6",
            }}
          ></div>
          <p
            className="text-sm font-display tracking-wider"
            style={{ color: isDark ? "#94A3B8" : "#64748B" }}
          >
            LOADING DISPLAY
          </p>
        </div>
      </div>
    );
  }

  if (data?.settings?.display_layout === "doctors") {
    // Render the Doctors Focus (compact columns) layout instead
    return <DoctorsDisplayPage />;
  }

  return (
    <div
      className="display-fullscreen flex flex-col relative"
      style={{
        background: isDark 
          ? "radial-gradient(circle at 50% 0%, rgba(15,118,110,0.08), transparent 70%), #060D1A"
          : "linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 45%, #F8FAFC 100%)",
        color: isDark ? "#F1F5F9" : "#0F172A",
        transition: "all 0.4s ease",
      }}
    >
      {/* ===== HEADER ===== */}
      <header
        className="shrink-0 px-8 py-4"
        style={{ borderBottom: isDark ? "2px solid rgba(148, 163, 184, 0.15)" : "2px solid rgba(148, 163, 184, 0.35)" }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Hospital Info */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden p-1.5"
              style={{
                background: isDark ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.96)",
                border: isDark ? "1px solid rgba(148,163,184,0.1)" : "1px solid rgba(148,163,184,0.3)",
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 16px rgba(15,23,42,0.12)",
              }}
            >
              <img
                src={kimsLogo}
                alt="KIMS logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1
                className="font-display font-bold text-2xl tracking-wide"
                style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
              >
                {data?.settings?.hospital_name || "HOSPITAL"}
              </h1>
              <p
                className="text-base font-semibold tracking-widest uppercase"
                style={{ color: "#14B8A6" }}
              >
                {data?.settings?.display_title || "CASUALTY DEPARTMENT"}
              </p>
            </div>
          </div>

          {/* Center: Date & Time */}
          <div className="text-center">
            <div
              className="font-display font-bold text-xl tracking-wide"
              style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
            >
              {data?.date
                ? formatDay(data.date) + ", " + formatDate(data.date)
                : "—"}
            </div>
            <div
              className="font-mono text-lg font-medium tabular-nums"
              style={{ color: "#14B8A6" }}
            >
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Right: Code Blue + Ambulance + Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(248, 250, 252, 0.8)",
                border: isDark ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid rgba(148, 163, 184, 0.3)",
                color: isDark ? "#F59E0B" : "#F59E0B",
                boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.05)",
              }}
              title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
            >
              {isDark ? (
                <HiOutlineSun className="w-6 h-6" />
              ) : (
                <HiOutlineMoon className="w-6 h-6" />
              )}
            </button>

            <div
              className="text-center px-5 py-3 rounded-xl animate-code-blue relative overflow-hidden"
              style={{
                background: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
                border: isDark ? "2px solid rgba(239, 68, 68, 0.4)" : "2px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <span
                className="text-[11px] font-bold uppercase tracking-[0.2em] block"
                style={{ color: isDark ? "#FCA5A5" : "#B91C1C" }}
              >
                Code Blue
              </span>
              <div
                className="font-display font-black text-4xl mt-1 leading-none"
                style={{ color: "#EF4444" }}
              >
                {data?.settings?.code_blue || "—"}
              </div>
            </div>
            <div
              className="px-5 py-3 rounded-xl min-w-[210px] text-center"
              style={{
                background: isDark 
                  ? "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.05))"
                  : "linear-gradient(135deg, rgba(15,118,110,0.12), rgba(16,185,129,0.08))",
                border: isDark ? "2px solid rgba(20,184,166,0.4)" : "2px solid rgba(20,184,166,0.3)",
                boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 22px rgba(15,118,110,0.12)",
              }}
            >
              <div
                className="text-[13px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "#14B8A6" }}
              >
                Ambulance
              </div>
              <div
                className="font-display font-black text-2xl mt-1 leading-none"
                style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
              >
                {ambulanceNumber || "—"}
              </div>
              <div className="text-xs" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                {ambulanceDetails || "Emergency transport"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 px-8 py-4 overflow-hidden relative">
        <div
          className="h-full rounded-xl overflow-hidden shadow-2xl relative"
          style={{
            border: isDark ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid rgba(148, 163, 184, 0.45)",
            background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255,255,255,0.84)",
            backdropFilter: isDark ? "blur(12px)" : "none",
          }}
        >
          {activeScreen === "roster" ? (
          <table key="roster" className="w-full h-full animate-flip-in" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th
                  className="w-[200px] p-4 text-left"
                  style={{
                    background: isDark ? "rgba(11, 17, 32, 0.8)" : "rgba(248, 250, 252, 0.95)",
                    borderBottom: isDark ? "2px solid rgba(148,163,184,0.2)" : "2px solid rgba(148,163,184,0.45)",
                    borderRight: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.3)",
                  }}
                >
                  <span
                    className="font-display font-bold text-xs uppercase tracking-[0.15em]"
                    style={{ color: isDark ? "#94A3B8" : "#334155" }}
                  >
                    Category / Shift
                  </span>
                </th>
                {data?.shifts?.map((shift, shiftIndex) => {
                  const colors = getShiftColors(shift, shiftIndex);
                  const isCurrent = shift.id === currentShiftId;
                  return (
                    <th
                      key={shift.id}
                      className="p-4 text-center relative"
                      style={{
                        background: isCurrent
                          ? colors.bgActive
                          : isDark ? "rgba(11, 17, 32, 0.8)" : "rgba(248, 250, 252, 0.95)",
                        borderBottom: `2px solid ${isCurrent ? colors.border : isDark ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.45)"}`,
                        borderRight: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.3)",
                        boxShadow: isCurrent ? colors.glow : "none",
                        transition: "all 1.5s ease",
                      }}
                    >
                      <div
                        className="font-display font-bold text-xl tracking-wide"
                        style={{ color: colors.text }}
                      >
                        {shift.name.toUpperCase()}
                      </div>
                      <div
                        className="text-xs mt-1 font-mono"
                        style={{ color: isDark ? "#94A3B8" : "#64748B" }}
                      >
                        {shift.start_time?.slice(0, 5)} –{" "}
                        {shift.end_time?.slice(0, 5)}
                      </div>
                      {isCurrent && (
                        <div className="absolute top-2 right-3 flex items-center gap-1.5">
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: colors.text }}
                          >
                            LIVE
                          </span>
                          <span
                            className="inline-block w-2 h-2 rounded-full animate-pulse"
                            style={{ background: colors.text }}
                          ></span>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayCategories.map((cat, catIndex) => {
                const catColor =
                  categoryColors[catIndex % categoryColors.length];
                return (
                  <tr
                    key={cat.id}
                    style={{ borderBottom: isDark ? "1px solid rgba(148,163,184,0.1)" : "1px solid rgba(148,163,184,0.2)" }}
                  >
                    <td
                      className="p-4 align-top"
                      style={{
                        background: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.9)",
                        borderRight: `3px solid ${catColor}`,
                      }}
                    >
                      <span
                        className="font-display font-bold text-base uppercase tracking-wide"
                        style={{ color: catColor }}
                      >
                        {cat.name}
                      </span>
                    </td>
                    {data?.shifts?.map((shift, shiftIndex) => {
                      const isNightSupervisor =
                        normalizeName(cat.name) ===
                        normalizeName(NIGHT_SUPERVISOR_NAME);
                      const isNightShift =
                        normalizeName(shift.name) ===
                        normalizeName(NIGHT_SHIFT_NAME);
                      const isShiftAllowed = !isNightSupervisor || isNightShift;
                      const staffList = isShiftAllowed
                        ? getStaffForCell(cat.name, shift.id)
                        : [];
                      const isCurrent = shift.id === currentShiftId;
                      const colors = getShiftColors(shift, shiftIndex);

                      return (
                        <td
                          key={shift.id}
                          className="p-3 align-top"
                          style={{
                            background: isCurrent ? colors.bg : "transparent",
                            borderRight: isDark ? "1px solid rgba(148,163,184,0.1)" : "1px solid rgba(148,163,184,0.2)",
                            transition: "background 1.5s ease",
                          }}
                        >
                          <div className="space-y-1.5">
                            {!isShiftAllowed && (
                              <div
                                className="text-center py-3 text-xs"
                                style={{ color: "#94A3B8" }}
                              >
                                Night only
                              </div>
                            )}
                            {staffList.map((s) => (
                              <div
                                key={s.id}
                                className="px-3 py-2.5 rounded-lg text-base font-medium shadow-sm"
                                style={{
                                  background: isCurrent
                                    ? isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)"
                                    : isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(248, 250, 252, 0.92)",
                                  border: isCurrent
                                    ? `1px solid ${colors.border}`
                                    : isDark ? "1px solid rgba(148,163,184,0.1)" : "1px solid rgba(148,163,184,0.3)",
                                  color: isDark ? "#F8FAFC" : "#0F172A",
                                  transition: "all 1s ease",
                                }}
                              >
                                {s.staff_name}
                                {s.designation && (
                                  <span
                                    className="block text-xs mt-1"
                                    style={{ color: isDark ? "#94A3B8" : "#64748B" }}
                                  >
                                    {s.designation}
                                  </span>
                                )}
                                {s.specialization && (
                                  <span
                                    className="block text-xs mt-0.5"
                                    style={{ color: isDark ? "#64748B" : "#9CA3AF" }}
                                  >
                                    {s.specialization}
                                  </span>
                                )}
                              </div>
                            ))}
                            {staffList.length === 0 && isShiftAllowed && (
                              <div
                                className="text-center py-3 text-xs"
                                style={{ color: "#94A3B8" }}
                              >
                                —
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          ) : (
          <div key="onCall" className="w-full h-full p-6 animate-flip-in overflow-y-auto" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="font-display font-bold text-2xl tracking-wide" style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}>
                On Call Doctors
              </h2>
              <div className="text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-xl"
                   style={{ background: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)", color: "#3B82F6", border: isDark ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(59,130,246,0.2)" }}>
                By Department
              </div>
            </div>
            
            {Object.keys(onCallDoctorsByDept).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 content-start">
                {Object.entries(onCallDoctorsByDept).map(([dept, doctors], idx) => {
                  const color = categoryColors[idx % categoryColors.length];
                  return (
                    <div key={dept} className="rounded-xl p-4 flex flex-col h-full shadow-lg"
                         style={{
                           background: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(248, 250, 252, 0.8)",
                           border: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.3)",
                           borderTop: `4px solid ${color}`
                         }}>
                      <h3 className="font-display font-bold text-lg mb-3 uppercase tracking-wider" style={{ color }}>
                        {dept}
                      </h3>
                      <div className="space-y-2 flex-1">
                        {doctors.map(doc => (
                          <div key={`${doc.id}-${doc.shift_id}`} className="rounded-lg p-3"
                               style={{ background: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.8)", border: isDark ? "1px solid rgba(148,163,184,0.05)" : "1px solid rgba(148,163,184,0.2)" }}>
                            <div className="font-medium text-base" style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}>
                              {doc.staff_name}
                            </div>
                            {doc.designation && (
                              <div className="text-xs mt-0.5" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                                {doc.designation}
                              </div>
                            )}
                            <div className="text-[10px] font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded"
                                 style={{ background: isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.15)", color: isDark ? "#CBD5E1" : "#475569" }}>
                              {doc.shift_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-lg" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                No doctors on call today.
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ===== SECURITY SUPERVISOR MARQUEE ===== */}
      {securityNames && (
        <div 
          className="shrink-0 overflow-hidden py-1"
          style={{
            background: isDark 
              ? "linear-gradient(90deg, rgba(239,68,68,0.05) 0%, rgba(239,68,68,0.2) 50%, rgba(239,68,68,0.05) 100%)"
              : "linear-gradient(90deg, rgba(239,68,68,0.05) 0%, rgba(239,68,68,0.15) 50%, rgba(239,68,68,0.05) 100%)",
            borderTop: "1px solid rgba(239, 68, 68, 0.4)",
            boxShadow: isDark ? "0 -4px 20px rgba(239, 68, 68, 0.15)" : "0 -4px 15px rgba(239, 68, 68, 0.1)",
          }}
        >
          <marquee 
            scrollamount="10" 
            className="font-display font-bold text-base tracking-[0.2em] uppercase flex items-center" 
            style={{ 
              color: isDark ? "#F87171" : "#DC2626",
              textShadow: isDark ? "0 0 10px rgba(239,68,68,0.6)" : "0 0 2px rgba(239,68,68,0.2)"
            }}
          >
            <span style={{ color: "#EF4444" }}>•</span>&nbsp;&nbsp;&nbsp;SECURITY SUPERVISOR : {securityNames}&nbsp;&nbsp;&nbsp;<span style={{ color: "#EF4444" }}>•</span>
            &nbsp;&nbsp;&nbsp;NIGHT SUPERVISOR : {nightSupervisorName}&nbsp;&nbsp;&nbsp;<span style={{ color: "#EF4444" }}>•</span>
          </marquee>
        </div>
      )}

      {/* ===== CERTIFICATE TICKER ===== */}
      <footer
        className="shrink-0 px-8 py-3"
        style={{ 
          borderTop: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.35)",
          background: isDark ? "rgba(11, 17, 32, 0.6)" : "transparent"
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
            style={{
              background: isDark ? "rgba(20,184,166,0.2)" : "rgba(15, 118, 110, 0.12)",
              color: "#14B8A6",
              border: isDark ? "1px solid rgba(20,184,166,0.3)" : "1px solid rgba(15,118,110,0.2)",
            }}
          >
            Licenses
          </span>
          <div className="flex-1 overflow-hidden relative">
            {/* Fade edges */}
            <div
              className="absolute left-0 top-0 bottom-0 w-8 z-10"
              style={{
                background: isDark 
                  ? "linear-gradient(to right, #060D1A, transparent)"
                  : "linear-gradient(to right, rgba(248,250,252,1), transparent)",
              }}
            ></div>
            <div
              className="absolute right-0 top-0 bottom-0 w-8 z-10"
              style={{
                background: isDark
                  ? "linear-gradient(to left, #060D1A, transparent)"
                  : "linear-gradient(to left, rgba(248,250,252,1), transparent)",
              }}
            ></div>

            <div
              className="flex gap-10 animate-ticker whitespace-nowrap"
              ref={tickerRef}
            >
              {data?.certificates?.length > 0 ? (
                <>
                  {[...data.certificates, ...data.certificates].map(
                    (cert, i) => (
                      <span
                        key={i}
                        className="text-sm inline-flex items-center gap-2.5"
                        style={{ color: isDark ? "#94A3B8" : "#64748B" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: "#14B8A6" }}
                        ></span>
                        <span
                          className="font-medium"
                          style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                        >
                          {cert.staff_name}
                        </span>
                        <span>—</span>
                        <span>{cert.certificate_type}</span>
                        {cert.certificate_number && (
                          <span
                            className="font-mono text-xs"
                            style={{ color: isDark ? "#64748B" : "#64748B" }}
                          >
                            #{cert.certificate_number}
                          </span>
                        )}
                        {cert.issuing_authority && (
                          <span style={{ color: isDark ? "#64748B" : "#64748B" }}>
                            ({cert.issuing_authority})
                          </span>
                        )}
                      </span>
                    ),
                  )}
                </>
              ) : (
                <span className="text-sm" style={{ color: "#94A3B8" }}>
                  No certificate data available
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
