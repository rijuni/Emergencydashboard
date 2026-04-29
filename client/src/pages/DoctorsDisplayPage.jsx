import { useEffect, useState } from "react";
import kimsLogo from "../assets/kims-logo.png";

export default function DoctorsDisplayPage() {
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

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
      parseInt(data?.settings?.auto_refresh_seconds, 10) || 30;
    const refreshInterval = setInterval(() => {
      fetchData();
    }, refreshSeconds * 1000);

    return () => clearInterval(refreshInterval);
  }, [data?.settings?.auto_refresh_seconds]);

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
    { key: "Doctor", label: "On-Duty Doctors" },
    { key: "Nursing Officer", label: "On-Duty Nursing Officers" },
    { key: "Pharmacist", label: "On-Duty Pharmacists" },
  ];

  const categoryStyles = {
    Doctor: {
      accent: "#F97316",
      text: "#9A3412",
      badgeBg: "rgba(249,115,22,0.15)",
      badgeText: "#C2410C",
      border: "rgba(249,115,22,0.35)",
      cardBg:
        "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(255,255,255,0.8))",
    },
    "Nursing Officer": {
      accent: "#3B82F6",
      text: "#1D4ED8",
      badgeBg: "rgba(59,130,246,0.14)",
      badgeText: "#1D4ED8",
      border: "rgba(59,130,246,0.35)",
      cardBg:
        "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(255,255,255,0.8))",
    },
    Pharmacist: {
      accent: "#10B981",
      text: "#047857",
      badgeBg: "rgba(16,185,129,0.14)",
      badgeText: "#047857",
      border: "rgba(16,185,129,0.35)",
      cardBg:
        "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.8))",
    },
  };

  const onDutyByCategory = liveCategories.reduce((acc, category) => {
    acc[category.key] = (data?.roster || []).filter(
      (entry) =>
        entry.category_name === category.key &&
        entry.shift_id === currentShiftId,
    );
    return acc;
  }, {});

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
            LOADING DOCTOR DISPLAY
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
          "radial-gradient(circle at 10% 10%, rgba(59,130,246,0.12), transparent 40%), radial-gradient(circle at 90% 0%, rgba(249,115,22,0.12), transparent 45%), linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 45%, #F8FAFC 100%)",
      }}
    >
      <header
        className="shrink-0 px-6 py-3"
        style={{ borderBottom: "2px solid rgba(148, 163, 184, 0.35)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center relative overflow-hidden p-1.5"
              style={{
                background: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(148,163,184,0.3)",
                boxShadow: "0 4px 16px rgba(15,23,42,0.12)",
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
                className="font-display font-bold text-xl tracking-wide"
                style={{ color: "#0F172A" }}
              >
                {data?.settings?.hospital_name || "HOSPITAL"}
              </h1>
              <p
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: "#0F766E" }}
              >
                Live Availability
              </p>
            </div>
          </div>

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

          <div className="flex items-center gap-3">
            <div
              className="px-5 py-2 rounded-xl text-center"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "2px solid rgba(239,68,68,0.3)",
                boxShadow: "0 10px 22px rgba(239,68,68,0.15)",
                minWidth: "180px",
                minHeight: "96px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                className="text-sm font-bold uppercase tracking-[0.3em]"
                style={{ color: "#B91C1C" }}
              >
                Code Blue
              </div>
              <div
                className="font-display font-black text-4xl mt-1"
                style={{ color: "#EF4444" }}
              >
                {data?.settings?.code_blue || "—"}
              </div>
            </div>
            <div
              className="px-5 py-2 rounded-xl text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(14,165,233,0.16), rgba(59,130,246,0.08))",
                border: "2px solid rgba(14,165,233,0.3)",
                boxShadow: "0 12px 24px rgba(14,165,233,0.12)",
                minWidth: "180px",
                minHeight: "96px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: "#0EA5E9" }}
              >
                Current Shift
              </div>
              <div
                className="font-display font-black text-2xl mt-0.5"
                style={{ color: "#0F172A" }}
              >
                {currentShift ? currentShift.name : "—"}
              </div>
              {currentShift && (
                <div className="text-xs" style={{ color: "#64748B" }}>
                  {currentShift.start_time?.slice(0, 5)} –{" "}
                  {currentShift.end_time?.slice(0, 5)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-4">
        <div
          className="h-full rounded-2xl p-6"
          style={{
            border: "1px solid rgba(148, 163, 184, 0.45)",
            background: "rgba(255,255,255,0.86)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-display font-bold text-lg tracking-wide"
              style={{ color: "#0F172A" }}
            >
              Live Duty Roster
            </h2>
            <div
              className="text-xs font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
              style={{
                background: "rgba(20,184,166,0.16)",
                color: "#0F766E",
                border: "1px solid rgba(15,118,110,0.25)",
              }}
            >
              Live Now
            </div>
          </div>

          {currentShiftId ? (
            <div className="space-y-6">
              {liveCategories.map((category) => {
                const staffList = onDutyByCategory[category.key] || [];
                const style =
                  categoryStyles[category.key] || categoryStyles.Doctor;
                return (
                  <div key={category.key}>
                    <div className="flex items-center justify-between mb-3">
                      <h3
                        className="text-sm font-semibold uppercase tracking-[0.2em]"
                        style={{ color: style.text }}
                      >
                        {category.label}
                      </h3>
                    </div>
                    {staffList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {staffList.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl px-4 py-3"
                            style={{
                              border: `1px solid ${style.border}`,
                              borderLeft: `4px solid ${style.accent}`,
                              background: style.cardBg,
                              boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                            }}
                          >
                            <div
                              className="text-base md:text-lg font-semibold"
                              style={{ color: "#0F172A" }}
                            >
                              {entry.staff_name}
                            </div>
                            {entry.designation && (
                              <div
                                className="text-xs mt-1"
                                style={{ color: "#64748B" }}
                              >
                                {entry.designation}
                              </div>
                            )}
                            {entry.registration_number && (
                              <div
                                className="text-xs font-mono mt-1"
                                style={{ color: "#0EA5E9" }}
                              >
                                {category.key === "Doctor"
                                  ? `License #${entry.registration_number}`
                                  : `ID #${entry.registration_number}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="text-center py-6 text-sm"
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
              className="text-center py-12 text-sm"
              style={{ color: "#94A3B8" }}
            >
              No active shift matches the current time.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
