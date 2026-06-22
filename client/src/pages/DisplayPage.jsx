import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import kimsLogo from "../assets/kims-logo.png";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
export default function DisplayPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState("roster");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [scale, setScale] = useState(1);

  const isDark = theme === "dark";

  // Dynamic resolution scaling for 4K/8K TVs
  useEffect(() => {
    const calculateScale = () => {
      const currentWidth = window.innerWidth;
      // 1920px is the baseline 1080p width the layout was built for
      if (currentWidth > 1920) {
        setScale(currentWidth / 1920);
      } else {
        setScale(1);
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/display/today");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error("Doctors display fetch error:", err);
    }
  };

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      fetchData();
    }, 0);

    return () => clearTimeout(initialLoad);
  }, []);

  useEffect(() => {
    const refreshSeconds =
      parseInt(data?.settings?.auto_refresh_seconds, 10) || 5;
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

  // Intercept browser back button
  useEffect(() => {
    // Push a dummy state so the back button is always active
    window.history.pushState(null, null, window.location.pathname);
    
    const handlePopState = () => {
      navigate("/login");
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

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
  const currentShift = data?.shifts?.find((s) => s.id === currentShiftId);

  const liveCategories = [
    { key: "Doctor", label: "Doctors" },
    { key: "Nursing Officer", label: "Nursing Staffs" },
    { key: "Pharmacist", label: "Pharmacists" },
  ];

  const categoryStyles = {
    Doctor: {
      accent: "#F97316",
      text: isDark ? "#FB923C" : "#9A3412",
      badgeBg: "rgba(249,115,22,0.15)",
      badgeText: "#C2410C",
      border: isDark ? "rgba(249,115,22,0.25)" : "rgba(249,115,22,0.35)",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(30,41,59,0.7))"
        : "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(255,255,255,0.8))",
    },
    "Nursing Officer": {
      accent: "#3B82F6",
      text: isDark ? "#60A5FA" : "#1D4ED8",
      badgeBg: "rgba(59,130,246,0.14)",
      badgeText: "#1D4ED8",
      border: isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.35)",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(30,41,59,0.7))"
        : "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(255,255,255,0.8))",
    },
    Pharmacist: {
      accent: "#10B981",
      text: isDark ? "#34D399" : "#047857",
      badgeBg: "rgba(16,185,129,0.14)",
      badgeText: "#047857",
      border: isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.35)",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(30,41,59,0.7))"
        : "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.8))",
    },
    "Security Supervisor": {
      accent: "#8B5CF6",
      text: isDark ? "#A78BFA" : "#6D28D9",
      badgeBg: "rgba(139,92,246,0.14)",
      badgeText: "#6D28D9",
      border: isDark ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.35)",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(30,41,59,0.7))"
        : "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(255,255,255,0.8))",
    },
  };

  const onDutyByCategory = liveCategories.reduce((acc, category) => {
    acc[category.key] = (data?.roster || []).filter(
      (entry) =>
        entry.category_name === category.key &&
        entry.shift_id === currentShiftId &&
        entry.notes !== "ON_CALL",
    );
    return acc;
  }, {});

  const normalizeName = (value) => (value || "").trim().toLowerCase();
   const getShownName = (entry) => {
     if (!entry) return "";
     const name = (entry.staff_display_name || entry.display_name) || entry.staff_name || entry.full_name || "";
     if (entry.prefix) {
       return `${entry.prefix.trim()} ${name}`.toUpperCase();
     }
     return name.toUpperCase();
   };
  const categoryColors = [
    "#14B8A6", "#3B82F6", "#A855F7", "#F59E0B", "#EF4444", "#22C55E", "#EC4899", "#6366F1"
  ];

  // Group on-call doctors by department (deduplicated by staff_id)
  const onCallDoctorsByDept = useMemo(() => {
    if (!data?.roster) return {};
    // Filter all ON_CALL doctors for the day (no shift_id filter — doctors are
    // added to all shifts so we must deduplicate by staff_id to avoid repeats)
    const allOnCall = data.roster.filter(r =>
      normalizeName(r.category_name) === "doctor" && r.notes === "ON_CALL"
    );
    // Deduplicate by staff_id, keeping the first occurrence
    const seen = new Set();
    const uniqueDoctors = [];
    allOnCall.forEach(doc => {
      if (!seen.has(doc.staff_id)) {
        seen.add(doc.staff_id);
        uniqueDoctors.push(doc);
      }
    });
    // Group unique doctors by department
    const grouped = {};
    uniqueDoctors.forEach(doc => {
      const dept = (doc.department || "Unassigned").trim().toUpperCase();
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(doc);
    });
    return grouped;
  }, [data?.roster]);

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
      ? securitySupervisors.map((s) => getShownName(s)).join(" • ")
      : defaultSupervisorName;

  const housekeepingSupervisors = useMemo(() => {
    return (data?.roster || []).filter(
      (entry) =>
        entry.category_name === "Housekeeping Supervisor" &&
        entry.shift_id === currentShiftId &&
        entry.notes !== "ON_CALL"
    );
  }, [data?.roster, currentShiftId]);
    const defaultHkSupervisorName = data?.settings?.housekeeping_supervisor_name || "MR PRASANNA KUMAR SARANGI";
    const housekeepingNames = housekeepingSupervisors.length > 0 
      ? housekeepingSupervisors.map((s) => getShownName(s)).join(" • ")
      : defaultHkSupervisorName;

  const nightSupervisorName = data?.nightSupervisorName || "NOT ASSIGNED";

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
            LOADING DOCTOR DISPLAY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="display-fullscreen flex flex-col relative"
      style={{
        zoom: scale,
        background: isDark
          ? "radial-gradient(circle at 10% 10%, rgba(59,130,246,0.08), transparent 40%), radial-gradient(circle at 90% 0%, rgba(249,115,22,0.08), transparent 45%), #060D1A"
          : "radial-gradient(circle at 10% 10%, rgba(59,130,246,0.12), transparent 40%), radial-gradient(circle at 90% 0%, rgba(249,115,22,0.12), transparent 45%), linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 45%, #F8FAFC 100%)",
        color: isDark ? "#F1F5F9" : "#0F172A",
        transition: "all 0.4s ease",
      }}
    >
      <header
        className="shrink-0 px-4 py-2"
        style={{ borderBottom: isDark ? "2px solid rgba(148, 163, 184, 0.15)" : "2px solid rgba(148, 163, 184, 0.35)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center relative overflow-hidden p-2"
              style={{
                background: "rgba(255,255,255,0.96)",
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
                className="font-display font-bold text-4xl tracking-wide"
                style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
              >
                {data?.settings?.hospital_name || "HOSPITAL"}
              </h1>
              <p
                className="text-lg font-bold tracking-widest uppercase mt-1"
                style={{ color: "#14B8A6" }}
              >
                Live Availability
              </p>
              <p
                className="text-2xl md:text-3xl font-bold mt-2 tracking-wider"
                style={{ color: isDark ? "#10B981" : "#059669" }}
              >
                HOD Of Emergancy Madicine : Dr.Siddhartha Mishra
              </p>
            </div>
          </div>

          <div className="text-center">
            <div
              className="font-display font-bold text-2xl tracking-wide"
              style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
            >
              {data?.date
                ? formatDay(data.date) + ", " + formatDate(data.date)
                : "—"}
            </div>
            <div
              className="font-mono text-xl font-bold tabular-nums mt-1"
              style={{ color: "#14B8A6" }}
            >
              {formatTime(currentTime)}
            </div>
          </div>

          <div className="flex items-center gap-4">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 mr-2"
              style={{
                background: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(248, 250, 252, 0.8)",
                border: isDark ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid rgba(148, 163, 184, 0.3)",
                color: isDark ? "#F59E0B" : "#F59E0B",
              }}
              title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
            >
              {isDark ? (
                <HiOutlineSun className="w-8 h-8" />
              ) : (
                <HiOutlineMoon className="w-8 h-8" />
              )}
            </button>

            <div
              className="px-6 py-3 rounded-2xl text-center"
              style={{
                background: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                border: isDark ? "2px solid rgba(239,68,68,0.4)" : "2px solid rgba(239,68,68,0.3)",
                boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 22px rgba(239,68,68,0.15)",
                minWidth: "220px",
                minHeight: "110px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                className="text-base font-black uppercase tracking-[0.3em]"
                style={{ color: isDark ? "#FCA5A5" : "#B91C1C" }}
              >
                Code Blue
              </div>
              <div
                className="font-display font-black text-6xl mt-1"
                style={{ color: "#EF4444" }}
              >
                {data?.settings?.code_blue || "—"}
              </div>
            </div>
            <div
              className="px-6 py-3 rounded-2xl text-center"
              style={{
                background: isDark
                  ? "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(59,130,246,0.1))"
                  : "linear-gradient(135deg, rgba(14,165,233,0.16), rgba(59,130,246,0.08))",
                border: isDark ? "2px solid rgba(14,165,233,0.4)" : "2px solid rgba(14,165,233,0.3)",
                boxShadow: isDark ? "0 12px 30px rgba(0,0,0,0.3)" : "0 12px 24px rgba(14,165,233,0.12)",
                minWidth: "220px",
                minHeight: "110px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                className="text-sm font-black uppercase tracking-[0.2em]"
                style={{ color: "#0EA5E9" }}
              >
                Current Shift
              </div>
              <div
                className="font-display font-black text-3xl mt-1"
                style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
              >
                {currentShift ? currentShift.name : "—"}
              </div>
              {currentShift && (
                <div className="text-sm font-bold mt-1" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                  {currentShift.start_time?.slice(0, 5)} –{" "}
                  {currentShift.end_time?.slice(0, 5)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-2">
        <div
          className="h-full rounded-2xl p-4"
          style={{
            border: isDark ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid rgba(148, 163, 184, 0.45)",
            background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255,255,255,0.86)",
            backdropFilter: isDark ? "blur(12px)" : "none",
          }}
        >
          {activeScreen === "roster" ? (
            <div key="roster" className="animate-flip-in h-full flex flex-col">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2
                  className="font-display font-bold text-base tracking-wide"
                  style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                >
                  Live Duty Roster
                </h2>
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
                  style={{
                    background: isDark ? "rgba(20,184,166,0.2)" : "rgba(20,184,166,0.16)",
                    color: "#14B8A6",
                    border: isDark ? "1px solid rgba(20,184,166,0.3)" : "1px solid rgba(15,118,110,0.25)",
                  }}
                >
                  Live Now
                </div>
              </div>

              {currentShiftId ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 content-start overflow-y-auto">
                  {liveCategories.map((category) => {
                    const staffList = onDutyByCategory[category.key] || [];
                    const style =
                      categoryStyles[category.key] || categoryStyles.Doctor;
                    return (
                      <div key={category.key} className="flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <h3
                            className="text-sm font-semibold uppercase tracking-[0.2em]"
                            style={{ color: style.text }}
                          >
                            {category.label}
                          </h3>
                        </div>
                        {staffList.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {staffList.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-lg px-5 py-5 mb-3"
                                style={{
                                  border: `2px solid ${style.border}`,
                                  borderLeft: `8px solid ${style.accent}`,
                                  background: style.cardBg,
                                  boxShadow: isDark ? "0 6px 24px rgba(0,0,0,0.4)" : "0 6px 16px rgba(15,23,42,0.1)",
                                }}
                              >
                                <div
                                  className="text-2xl md:text-3xl font-bold"
                                  style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                                >
                                  {getShownName(entry)}
                                </div>
                                <div
                                  className="text-sm md:text-base mt-3 font-bold inline-block px-3 py-1 rounded-full uppercase tracking-wider"
                                  style={{
                                    background: style.badgeBg,
                                    color: style.badgeText,
                                    border: `1px solid ${style.border}`,
                                  }}
                                >
                                  {[entry.designation, entry.specialization]
                                    .filter(Boolean)
                                    .join(" • ") || "\u00A0"}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="text-center py-4 text-xs"
                            style={{ color: "#94A3B8" }}
                          >
                            No staff assigned for this category in the current
                            shift.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="text-center py-8 text-sm flex-1"
                  style={{ color: "#94A3B8" }}
                >
                  No active shift matches the current time.
                </div>
              )}
            </div>
          ) : (
            <div key="onCall" className="animate-flip-in h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="font-display font-bold text-xl tracking-wide" style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}>
                  On Call Doctors
                </h2>
              </div>
              
              {Object.keys(onCallDoctorsByDept).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 content-start overflow-y-auto">
                  {Object.entries(onCallDoctorsByDept).map(([dept, doctors], idx) => {
                    const color = categoryColors[idx % categoryColors.length];
                    return (
                      <div key={dept} className="rounded-xl p-4 flex flex-col h-full shadow-sm"
                           style={{
                             background: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(248, 250, 252, 0.8)",
                             border: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.3)",
                             borderTop: `4px solid ${color}`
                           }}>
                        <h3 className="font-display font-bold text-base mb-3 uppercase tracking-wider" style={{ color }}>
                          {dept}
                        </h3>
                        <div className="space-y-3 flex-1">
                          {doctors.map(doc => (
                            <div key={`${doc.id}-${doc.shift_id}`} className="rounded-lg p-5"
                                 style={{ background: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.8)", border: isDark ? "2px solid rgba(148,163,184,0.15)" : "2px solid rgba(148,163,184,0.3)" }}>
                              <div className="font-bold text-xl md:text-2xl" style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}>
                                {getShownName(doc)}
                              </div>
                              <div 
                                className="text-sm md:text-base mt-3 font-bold inline-block px-3 py-1 rounded-full uppercase tracking-wider" 
                                style={{ 
                                  color: color, 
                                  border: `1px solid ${color}` 
                                }}
                              >
                                {doc.designation || "DOCTOR"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                  No doctors on call currently.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {securityNames && (
        <div 
          className="shrink-0 overflow-hidden py-4"
          style={{
            background: isDark 
              ? "linear-gradient(90deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.2) 50%, rgba(16,185,129,0.05) 100%)"
              : "linear-gradient(90deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.15) 50%, rgba(16,185,129,0.05) 100%)",
            borderTop: "2px solid rgba(16, 185, 129, 0.4)",
            boxShadow: isDark ? "0 -4px 20px rgba(16, 185, 129, 0.15)" : "0 -4px 15px rgba(16, 185, 129, 0.1)",
          }}
        >
          <marquee 
            scrollamount="15" 
            className="font-display font-bold text-5xl tracking-[0.2em] uppercase flex items-center" 
            style={{ 
              color: isDark ? "#34D399" : "#059669",
              textShadow: isDark ? "0 0 10px rgba(16,185,129,0.6)" : "0 0 2px rgba(16,185,129,0.2)",
              padding: "16px 0"
            }}
          >
            <span style={{ display: "inline-block", width: "15rem" }}></span>SECURITY SUPERVISOR : {securityNames}<span style={{ display: "inline-block", width: "15rem" }}></span>
            <span style={{ display: "inline-block", width: "15rem" }}></span>HOUSEKEEPING SUPERVISOR : {housekeepingNames}<span style={{ display: "inline-block", width: "15rem" }}></span>
            <span style={{ display: "inline-block", width: "15rem" }}></span>Manager On Duty : {nightSupervisorName}<span style={{ display: "inline-block", width: "15rem" }}></span>
          </marquee>
        </div>
      )}
    </div>
  );
}
