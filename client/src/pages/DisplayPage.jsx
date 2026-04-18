import { useState, useEffect, useRef } from "react";

export default function DisplayPage() {
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const tickerRef = useRef(null);

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
      (r) => r.category_name === categoryName && r.shift_id === shiftId,
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
      bg: "rgba(245, 158, 11, 0.08)",
      bgActive: "rgba(245, 158, 11, 0.16)",
      border: "rgba(245, 158, 11, 0.35)",
      text: "#F59E0B",
      glow: "0 0 26px rgba(245, 158, 11, 0.12)",
    },
    Evening: {
      bg: "rgba(139, 92, 246, 0.08)",
      bgActive: "rgba(139, 92, 246, 0.16)",
      border: "rgba(139, 92, 246, 0.35)",
      text: "#8B5CF6",
      glow: "0 0 26px rgba(139, 92, 246, 0.12)",
    },
    Night: {
      bg: "rgba(59, 130, 246, 0.08)",
      bgActive: "rgba(59, 130, 246, 0.16)",
      border: "rgba(59, 130, 246, 0.35)",
      text: "#3B82F6",
      glow: "0 0 26px rgba(59, 130, 246, 0.12)",
    },
  };

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

  if (loading) {
    return (
      <div
        className="display-fullscreen flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
        }}
      >
        <div className="text-center animate-fade-in">
          <div
            className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: "rgba(15,118,110,0.2)",
              borderTopColor: "#0F766E",
            }}
          ></div>
          <p
            className="text-sm font-display tracking-wider"
            style={{ color: "#64748B" }}
          >
            LOADING DISPLAY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="display-fullscreen flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 45%, #F8FAFC 100%)",
        transition: "background 0.4s ease",
      }}
    >
      {/* ===== HEADER ===== */}
      <header
        className="shrink-0 px-6 py-3"
        style={{ borderBottom: "2px solid rgba(148, 163, 184, 0.35)" }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Hospital Info */}
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0F766E, #14B8A6)",
                boxShadow: "0 4px 20px rgba(20,184,166,0.2)",
              }}
            >
              🏥
            </div>
            <div>
              <h1
                className="font-display font-bold text-xl tracking-wide"
                style={{ color: "#0F172A" }}
              >
                {data?.settings?.hospital_name || "HOSPITAL"}
              </h1>
              <p
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: "#0F766E" }}
              >
                {data?.settings?.display_title || "CASUALTY DEPARTMENT"}
              </p>
            </div>
          </div>

          {/* Center: Date & Time */}
          <div className="text-center">
            <div
              className="font-display font-bold text-lg tracking-wide"
              style={{ color: "#0F172A" }}
            >
              {data?.date
                ? formatDay(data.date) + ", " + formatDate(data.date)
                : "—"}
            </div>
            <div
              className="font-mono text-base font-medium tabular-nums"
              style={{ color: "#0F766E" }}
            >
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Right: Code Blue */}
          <div className="flex items-center">
            <div
              className="text-center px-6 py-2.5 rounded-xl animate-code-blue relative overflow-hidden"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "2px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <span
                className="text-xs font-bold uppercase tracking-[0.2em] block"
                style={{ color: "#B91C1C" }}
              >
                Code Blue
              </span>
              <div
                className="font-display font-black text-4xl mt-0.5"
                style={{ color: "#EF4444" }}
              >
                {data?.settings?.code_blue || "—"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN ROSTER TABLE ===== */}
      <div className="flex-1 px-6 py-3 overflow-hidden">
        <div
          className="h-full rounded-xl overflow-hidden"
          style={{
            border: "1px solid rgba(148, 163, 184, 0.45)",
            background: "rgba(255,255,255,0.84)",
          }}
        >
          <table className="w-full h-full" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th
                  className="w-[180px] p-3 text-left"
                  style={{
                    background: "rgba(248, 250, 252, 0.95)",
                    borderBottom: "2px solid rgba(148,163,184,0.45)",
                    borderRight: "1px solid rgba(148,163,184,0.3)",
                  }}
                >
                  <span
                    className="font-display font-bold text-xs uppercase tracking-[0.15em]"
                    style={{ color: "#334155" }}
                  >
                    Category / Shift
                  </span>
                </th>
                {data?.shifts?.map((shift) => {
                  const colors =
                    shiftColors[shift.name] || shiftColors["Morning"];
                  const isCurrent = shift.id === currentShiftId;
                  return (
                    <th
                      key={shift.id}
                      className="p-3 text-center relative"
                      style={{
                        background: isCurrent
                          ? colors.bgActive
                          : "rgba(248, 250, 252, 0.95)",
                        borderBottom: `2px solid ${isCurrent ? colors.border : "rgba(148,163,184,0.45)"}`,
                        borderRight: "1px solid rgba(148,163,184,0.3)",
                        boxShadow: isCurrent ? colors.glow : "none",
                        transition: "all 1.5s ease",
                      }}
                    >
                      <div
                        className="font-display font-bold text-lg tracking-wide"
                        style={{ color: colors.text }}
                      >
                        {shift.name.toUpperCase()}
                      </div>
                      <div
                        className="text-xs mt-0.5 font-mono"
                        style={{ color: "#64748B" }}
                      >
                        {shift.start_time?.slice(0, 5)} –{" "}
                        {shift.end_time?.slice(0, 5)}
                      </div>
                      {isCurrent && (
                        <div className="absolute top-2 right-3 flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
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
              {data?.categories?.map((cat, catIndex) => {
                const catColor =
                  categoryColors[catIndex % categoryColors.length];
                return (
                  <tr
                    key={cat.id}
                    style={{ borderBottom: "1px solid rgba(148,163,184,0.2)" }}
                  >
                    <td
                      className="p-3 align-top"
                      style={{
                        background: "rgba(248, 250, 252, 0.9)",
                        borderRight: `3px solid ${catColor}`,
                      }}
                    >
                      <span
                        className="font-display font-bold text-sm uppercase tracking-wide"
                        style={{ color: catColor }}
                      >
                        {cat.name}
                      </span>
                    </td>
                    {data?.shifts?.map((shift) => {
                      const staffList = getStaffForCell(cat.name, shift.id);
                      const isCurrent = shift.id === currentShiftId;
                      const colors =
                        shiftColors[shift.name] || shiftColors["Morning"];

                      return (
                        <td
                          key={shift.id}
                          className="p-2 align-top"
                          style={{
                            background: isCurrent ? colors.bg : "transparent",
                            borderRight: "1px solid rgba(148,163,184,0.2)",
                            transition: "background 1.5s ease",
                          }}
                        >
                          <div className="space-y-1.5">
                            {staffList.map((s) => (
                              <div
                                key={s.id}
                                className="px-3 py-2 rounded-lg text-sm font-medium"
                                style={{
                                  background: isCurrent
                                    ? "rgba(255, 255, 255, 0.95)"
                                    : "rgba(248, 250, 252, 0.92)",
                                  border: isCurrent
                                    ? `1px solid ${colors.border}`
                                    : "1px solid rgba(148,163,184,0.3)",
                                  color: "#0F172A",
                                  transition: "all 1s ease",
                                }}
                              >
                                {s.staff_name}
                                {s.designation && (
                                  <span
                                    className="block text-xs mt-0.5"
                                    style={{ color: "#64748B" }}
                                  >
                                    {s.designation}
                                  </span>
                                )}
                              </div>
                            ))}
                            {staffList.length === 0 && (
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
        </div>
      </div>

      {/* ===== CERTIFICATE TICKER ===== */}
      <footer
        className="shrink-0 px-6 py-2.5"
        style={{ borderTop: "1px solid rgba(148,163,184,0.35)" }}
      >
        <div className="flex items-center gap-4">
          <span
            className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(15, 118, 110, 0.12)",
              color: "#0F766E",
              border: "1px solid rgba(15,118,110,0.2)",
            }}
          >
            Licenses
          </span>
          <div className="flex-1 overflow-hidden relative">
            {/* Fade edges */}
            <div
              className="absolute left-0 top-0 bottom-0 w-8 z-10"
              style={{
                background:
                  "linear-gradient(to right, rgba(248,250,252,1), transparent)",
              }}
            ></div>
            <div
              className="absolute right-0 top-0 bottom-0 w-8 z-10"
              style={{
                background:
                  "linear-gradient(to left, rgba(248,250,252,1), transparent)",
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
                        className="text-sm inline-flex items-center gap-2"
                        style={{ color: "#64748B" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: "#0F766E" }}
                        ></span>
                        <span
                          className="font-medium"
                          style={{ color: "#0F172A" }}
                        >
                          {cert.staff_name}
                        </span>
                        <span>—</span>
                        <span>{cert.certificate_type}</span>
                        {cert.certificate_number && (
                          <span
                            className="font-mono text-xs"
                            style={{ color: "#64748B" }}
                          >
                            #{cert.certificate_number}
                          </span>
                        )}
                        {cert.issuing_authority && (
                          <span style={{ color: "#64748B" }}>
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
