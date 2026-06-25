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
  const [onCallPage, setOnCallPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [scale, setScale] = useState(1);
  const [alertIndex, setAlertIndex] = useState(0);

  const isDark = theme === "dark";

  useEffect(() => {
    const interval = setInterval(() => {
      setAlertIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const alertsData = useMemo(() => [
    { title: "CODE BLUE", count: data?.settings?.code_blue || "33", r: 239, g: 68, b: 68, textLight: "#B91C1C", textDark: "#FCA5A5", valColor: "#EF4444" },
    // { title: "CODE RED", count: "44", r: 239, g: 68, b: 68, textLight: "#B91C1C", textDark: "#FCA5A5", valColor: "#EF4444" },
    // { title: "FIRE OFFICER", count: "77", r: 16, g: 185, b: 129, textLight: "#047857", textDark: "#6EE7B7", valColor: "#10B981" },
    // { title: "CODE PINK", count: "44", r: 236, g: 72, b: 153, textLight: "#BE185D", textDark: "#F9A8D4", valColor: "#EC4899" },
    // { title: "CODE YELLOW", count: "44", r: 234, g: 179, b: 8, textLight: "#A16207", textDark: "#FDE047", valColor: "#EAB308" },
    // { title: "CODE VIOLET", count: "44", r: 139, g: 92, b: 246, textLight: "#6D28D9", textDark: "#C4B5FD", valColor: "#8B5CF6" },
    // { title: "CODE BLACK", count: "44", r: 75, g: 85, b: 99, textLight: "#111827", textDark: "#F3F4F6", valColor: isDark ? "#F3F4F6" : "#111827" },
    // { title: "CODE ORANGE", count: "44", r: 249, g: 115, b: 22, textLight: "#C2410C", textDark: "#FDBA74", valColor: "#F97316" },
    // { title: "CODE GREY", count: "44", r: 107, g: 114, b: 128, textLight: "#374151", textDark: "#D1D5DB", valColor: "#6B7280" },
    // { title: "CODE PURPLE", count: "44", r: 168, g: 85, b: 247, textLight: "#7E22CE", textDark: "#D8B4FE", valColor: "#A855F7" },
  ], [data?.settings?.code_blue, isDark]);

  const normalizeName = (value) => (value || "").trim().toLowerCase();

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

  const liveCategories = useMemo(() => [
    { key: "Doctor", label: "Doctors" },
    { key: "Nursing Officer", label: "Nursing Staffs" },
    { key: "Pharmacist", label: "Pharmacists" },
  ], []);

  // Deduplicate and get all unique on-call doctors
  const uniqueOnCallDoctors = useMemo(() => {
    if (!data?.roster) return [];
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
    return uniqueDoctors;
  }, [data?.roster]);

  // Calculate total pages for on-call doctors (8 per page)
  const onCallPagesCount = useMemo(() => {
    return Math.max(1, Math.ceil(uniqueOnCallDoctors.length / 8));
  }, [uniqueOnCallDoctors]);

  // Get raw on-duty staff list grouped by category
  const rawOnDutyByCategory = useMemo(() => {
    if (!data?.roster) return {};
    return liveCategories.reduce((acc, category) => {
      acc[category.key] = data.roster.filter(
        (entry) =>
          entry.category_name === category.key &&
          entry.shift_id === currentShiftId &&
          entry.notes !== "ON_CALL"
      );
      return acc;
    }, {});
  }, [data?.roster, currentShiftId, liveCategories]);

  // Calculate total pages for Live Duty Roster (at most 3 per page in any category)
  const rosterPagesCount = useMemo(() => {
    const lists = Object.values(rawOnDutyByCategory);
    if (lists.length === 0) return 1;
    const lengths = lists.map(list => list.length);
    const maxLen = Math.max(0, ...lengths);
    return Math.max(1, Math.ceil(maxLen / 3));
  }, [rawOnDutyByCategory]);

  // Reset page index if pages count changes and current page becomes out of bounds
  useEffect(() => {
    if (onCallPage >= onCallPagesCount) {
      setOnCallPage(0);
    }
  }, [onCallPagesCount, onCallPage]);

  useEffect(() => {
    if (rosterPage >= rosterPagesCount) {
      setRosterPage(0);
    }
  }, [rosterPagesCount, rosterPage]);

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
      if (activeScreen === "roster") {
        if (rosterPage + 1 < rosterPagesCount) {
          setRosterPage(prev => prev + 1);
        } else {
          setRosterPage(0);
          setOnCallPage(0);
          setActiveScreen("onCallDoctors");
        }
      } else {
        if (onCallPage + 1 < onCallPagesCount) {
          setOnCallPage(prev => prev + 1);
        } else {
          setOnCallPage(0);
          setRosterPage(0);
          setActiveScreen("roster");
        }
      }
    }, 10000);
    return () => clearInterval(screenInterval);
  }, [activeScreen, rosterPage, rosterPagesCount, onCallPage, onCallPagesCount]);

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



  const categoryStyles = {
    Doctor: {
      accent: "#F59E0B",
      text: isDark ? "#FBBF24" : "#B45309",
      badgeBg: "rgba(245,158,11,0.2)",
      badgeText: isDark ? "#FBBF24" : "#B45309",
      border: "#F59E0B",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,41,59,0.8))"
        : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(255,255,255,0.9))",
    },
    "Nursing Officer": {
      accent: "#A855F7",
      text: isDark ? "#D8B4FE" : "#7E22CE",
      badgeBg: "rgba(168,85,247,0.2)",
      badgeText: isDark ? "#D8B4FE" : "#7E22CE",
      border: "#A855F7",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(30,41,59,0.8))"
        : "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(255,255,255,0.9))",
    },
    Pharmacist: {
      accent: "#F59E0B",
      text: isDark ? "#FBBF24" : "#B45309",
      badgeBg: "rgba(245,158,11,0.2)",
      badgeText: isDark ? "#FBBF24" : "#B45309",
      border: "#F59E0B",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,41,59,0.8))"
        : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(255,255,255,0.9))",
    },
    "Security Supervisor": {
      accent: "#A855F7",
      text: isDark ? "#D8B4FE" : "#7E22CE",
      badgeBg: "rgba(168,85,247,0.2)",
      badgeText: isDark ? "#D8B4FE" : "#7E22CE",
      border: "#A855F7",
      cardBg: isDark
        ? "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(30,41,59,0.8))"
        : "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(255,255,255,0.9))",
    },
  };

  const onDutyByCategory = useMemo(() => {
    const sliced = {};
    Object.entries(rawOnDutyByCategory).forEach(([key, list]) => {
      sliced[key] = list.slice(rosterPage * 3, (rosterPage + 1) * 3);
    });
    return sliced;
  }, [rawOnDutyByCategory, rosterPage]);

  const getShownName = (entry) => {
    if (!entry) return "";
    const name = (entry.staff_display_name || entry.display_name) || entry.staff_name || entry.full_name || "";
    if (entry.prefix) {
      return `${entry.prefix.trim()} ${name}`.toUpperCase();
    }
    return name.toUpperCase();
  };
  const categoryColors = [
    "#F59E0B", "#A855F7"
  ];

  // Get current page of on-call doctors
  const pagedOnCallDoctors = useMemo(() => {
    return uniqueOnCallDoctors.slice(onCallPage * 8, (onCallPage + 1) * 8);
  }, [uniqueOnCallDoctors, onCallPage]);

  const securitySupervisors = useMemo(() => {
    return (data?.roster || []).filter(
      (entry) =>
        entry.category_name === "Security Supervisor" &&
        entry.shift_id === currentShiftId &&
        entry.notes !== "ON_CALL"
    );
  }, [data?.roster, currentShiftId]);
  const securityNames = securitySupervisors.length > 0
    ? securitySupervisors.map((s) => getShownName(s)).join(" • ")
    : (data?.settings?.security_supervisor_name || "NOT ASSIGNED");

  const housekeepingSupervisors = useMemo(() => {
    return (data?.roster || []).filter(
      (entry) =>
        entry.category_name === "Housekeeping Supervisor" &&
        entry.shift_id === currentShiftId &&
        entry.notes !== "ON_CALL"
    );
  }, [data?.roster, currentShiftId]);
  const housekeepingNames = housekeepingSupervisors.length > 0
    ? housekeepingSupervisors.map((s) => getShownName(s)).join(" • ")
    : (data?.settings?.housekeeping_supervisor_name || "NOT ASSIGNED");

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

  const tickerText = (
    <div className="flex items-center shrink-0" style={{ gap: "10rem", paddingRight: "10rem" }}>
      <span>SECURITY SUPERVISOR : {securityNames}</span>
      <span>HOUSEKEEPING SUPERVISOR : {housekeepingNames}</span>
      <span>Manager On Duty : {nightSupervisorName}</span>
    </div>
  );

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
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-8 flex-1">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.96)",
                border: isDark ? "1px solid rgba(148,163,184,0.1)" : "1px solid rgba(148,163,184,0.3)",
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 16px rgba(15,23,42,0.12)",
              }}
            >
              <img
                src={kimsLogo}
                alt="KIMS logo"
                className="w-full h-full object-contain scale-110"
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
                className="text-sm md:text-base lg:text-lg font-bold mt-2 tracking-normal whitespace-nowrap"
                style={{
                  lineHeight: 1.2,
                  color: isDark ? "#ffffff" : "#059669",
                }}
              >
                EMG Medicine HOD: Dr. Siddhartha Mishra
              </p>
            </div>
          </div>

          <div className="text-center flex-1">
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

          <div className="flex items-center justify-end gap-6 flex-1">



            <div className="relative min-w-[220px] min-h-[110px]">
              {alertsData.map((alert, idx) => {
                const isActive = idx === (alertIndex % alertsData.length);
                return (
                  <div
                    key={alert.title}
                    className="absolute inset-0 px-6 py-3 rounded-2xl text-center flex flex-col justify-center transition-all duration-700 ease-in-out"
                    style={{
                      background: isDark ? `rgba(${alert.r},${alert.g},${alert.b},0.15)` : `rgba(${alert.r},${alert.g},${alert.b},0.1)`,
                      border: isDark ? `2px solid rgba(${alert.r},${alert.g},${alert.b},0.4)` : `2px solid rgba(${alert.r},${alert.g},${alert.b},0.3)`,
                      boxShadow: isActive ? (isDark ? `0 10px 30px rgba(0,0,0,0.3)` : `0 10px 22px rgba(${alert.r},${alert.g},${alert.b},0.15)`) : "none",
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
                      pointerEvents: isActive ? "auto" : "none",
                      zIndex: isActive ? 10 : 0
                    }}
                  >
                    <div
                      className="text-base font-black uppercase tracking-[0.3em]"
                      style={{ color: isDark ? alert.textDark : alert.textLight }}
                    >
                      {alert.title}
                    </div>
                    <div
                      className="font-display font-black text-6xl mt-1"
                      style={{ color: alert.valColor }}
                    >
                      {alert.count}
                    </div>
                  </div>
                );
              })}
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
                                className="rounded-lg px-5 py-5 mb-3 flex flex-col justify-center items-start"
                                style={{
                                  border: `2px solid ${style.border}`,
                                  borderLeft: `8px solid ${style.accent}`,
                                  background: style.cardBg,
                                  boxShadow: isDark ? "0 6px 24px rgba(0,0,0,0.4)" : "0 6px 16px rgba(15,23,42,0.1)",
                                  minHeight: "160px"
                                }}
                              >
                                <div>
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
                                      color: "#FFFFFF",
                                      border: `1px solid ${style.border}`,
                                    }}
                                  >
                                    {[entry.designation, entry.specialization]
                                      .filter(Boolean)
                                      .join(" • ") || "\u00A0"}
                                  </div>
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

              {pagedOnCallDoctors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto pb-4 content-start items-start">
                  {pagedOnCallDoctors.map((doc, idx) => {
                    const color = categoryColors[idx % categoryColors.length];
                    const dept = (doc.department || "UNASSIGNED").trim().toUpperCase();
                    return (
                      <div key={`${doc.id}-${doc.shift_id}`} className="rounded-xl p-4 flex flex-col shadow-sm h-full"
                        style={{
                          background: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(248, 250, 252, 0.8)",
                          border: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.3)",
                          borderTop: `4px solid ${color}`
                        }}>
                        <h3 className="font-display font-bold text-base mb-3 uppercase tracking-wider" style={{ color }}>
                          {dept}
                        </h3>
                        <div className="rounded-lg p-5 flex flex-col justify-center items-start flex-1"
                          style={{
                            background: isDark ? `linear-gradient(135deg, ${color}33, rgba(30,41,59,0.8))` : `linear-gradient(135deg, ${color}22, rgba(255,255,255,0.9))`,
                            border: `2px solid ${color}`,
                            borderLeft: `8px solid ${color}`,
                            minHeight: "160px"
                          }}>
                          <div>
                            <div className="font-bold text-xl md:text-2xl" style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}>
                              {getShownName(doc)}
                            </div>
                            <div
                              className="text-sm md:text-base mt-3 font-bold inline-block px-3 py-1 rounded-full uppercase tracking-wider"
                              style={{
                                color: "#FFFFFF",
                                border: `1px solid ${color}`
                              }}
                            >
                              {doc.designation || "DOCTOR"}
                            </div>
                          </div>
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
          className="shrink-0 overflow-hidden py-4 clear-marquee-container"
          style={{
            background: isDark
              ? "linear-gradient(90deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.2) 50%, rgba(16,185,129,0.05) 100%)"
              : "linear-gradient(90deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.15) 50%, rgba(16,185,129,0.05) 100%)",
            borderTop: "2px solid rgba(16, 185, 129, 0.4)",
            boxShadow: isDark ? "0 -4px 20px rgba(16, 185, 129, 0.15)" : "0 -4px 15px rgba(16, 185, 129, 0.1)",
          }}
        >
          <div
            className="clear-marquee-content"
            style={{
              color: isDark ? "#34D399" : "#059669",
              textShadow: isDark ? "0 0 10px rgba(16,185,129,0.6)" : "0 0 2px rgba(16,185,129,0.2)",
              padding: "16px 0",
              fontSize: "3.2rem",
              fontFamily: "Outfit, Inter, sans-serif",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
            }}
          >
            {tickerText}
            {tickerText}
          </div>
        </div>
      )}
    </div>
  );
}
