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

  const onDutyDoctors = (data?.roster || []).filter(
    (r) => r.category_name === "Doctor" && r.shift_id === currentShiftId,
  );

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
          "linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 45%, #F8FAFC 100%)",
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
                Doctor Availability
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

          <div
            className="px-5 py-2 rounded-xl text-center"
            style={{
              background: "rgba(14,165,233,0.08)",
              border: "2px solid rgba(14,165,233,0.25)",
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
              On-Duty Doctors
            </h2>
            <div
              className="text-xs font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
              style={{
                background: "rgba(20,184,166,0.12)",
                color: "#0F766E",
                border: "1px solid rgba(15,118,110,0.2)",
              }}
            >
              Live Now
            </div>
          </div>

          {currentShiftId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {onDutyDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl px-4 py-3"
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    background:
                      "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(20,184,166,0.05))",
                  }}
                >
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "#0F172A" }}
                  >
                    {doc.staff_name}
                  </div>
                  {doc.designation && (
                    <div className="text-xs mt-1" style={{ color: "#64748B" }}>
                      {doc.designation}
                    </div>
                  )}
                  {doc.registration_number && (
                    <div
                      className="text-xs font-mono mt-1"
                      style={{ color: "#0EA5E9" }}
                    >
                      Reg #{doc.registration_number}
                    </div>
                  )}
                </div>
              ))}
              {onDutyDoctors.length === 0 && (
                <div
                  className="col-span-full text-center py-12 text-sm"
                  style={{ color: "#94A3B8" }}
                >
                  No doctors assigned for the current shift.
                </div>
              )}
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
