import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDuplicate,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineDocumentDownload
} from "react-icons/hi";

// Static color map — avoids dynamic Tailwind class issues
const SHIFT_STYLES = {
  Morning: {
    text: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    badge: "shift-morning-badge",
  },
  Evening: {
    text: "#8B5CF6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    badge: "shift-evening-badge",
  },
  Night: {
    text: "#3B82F6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    badge: "shift-night-badge",
  },
};

const SHIFT_FALLBACKS = [
  {
    text: "#0EA5E9",
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.2)",
    badge: "shift-sky-badge",
  },
  {
    text: "#22C55E",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    badge: "shift-green-badge",
  },
  {
    text: "#F97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
    badge: "shift-orange-badge",
  },
  {
    text: "#E11D48",
    bg: "rgba(225,29,72,0.08)",
    border: "rgba(225,29,72,0.2)",
    badge: "shift-rose-badge",
  },
  {
    text: "#8B5CF6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    badge: "shift-violet-badge",
  },
];

const getShiftStyles = (shift, index) =>
  SHIFT_STYLES[shift.name] || SHIFT_FALLBACKS[index % SHIFT_FALLBACKS.length];

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

export default function RosterPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roster, setRoster] = useState([]);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayLayout, setDisplayLayout] = useState("casualty");
  const [savingLayout, setSavingLayout] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  const fetchMeta = useCallback(async () => {
    try {
      const [staffRes, catRes, shiftRes, settingsRes] = await Promise.all([
        api.get("/staff?is_active=true"),
        api.get("/staff/categories"),
        api.get("/roster/shifts"),
        api.get("/display/settings"),
      ]);
      setStaff(staffRes.data.staff);
      setCategories(catRes.data.categories);
      setShifts(shiftRes.data.shifts);
      if (settingsRes.data.settings?.display_layout) {
        setDisplayLayout(settingsRes.data.settings.display_layout);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleLayoutChange = async (newLayout) => {
    setDisplayLayout(newLayout);
    setSavingLayout(true);
    try {
      await api.put("/display/settings", {
        settings: { display_layout: newLayout },
      });
      toast.success("Display layout updated");
    } catch (err) {
      toast.error("Failed to update layout");
    } finally {
      setSavingLayout(false);
    }
  };

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/roster?date=${date}`);
      setRoster(res.data.roster);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const initialMetaLoad = setTimeout(() => {
      fetchMeta();
    }, 0);

    return () => clearTimeout(initialMetaLoad);
  }, [fetchMeta]);

  useEffect(() => {
    const initialRosterLoad = setTimeout(() => {
      fetchRoster();
    }, 0);

    return () => clearTimeout(initialRosterLoad);
  }, [fetchRoster]);

  const changeDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const rosterCategories = useMemo(
    () =>
      categories.filter((category) =>
        ROSTER_CATEGORY_ALLOWLIST.some(
          (name) => normalizeName(name) === normalizeName(category.name),
        ),
      ),
    [categories],
  );

  const getAssigned = (categoryId, shiftId) => {
    return roster.filter(
      (r) =>
        r.category_name ===
        rosterCategories.find((c) => c.id === categoryId)?.name &&
        r.shift_id === shiftId &&
        r.notes !== "ON_CALL",
    );
  };

  const staffByCategory = useMemo(() => {
    const map = {};
    rosterCategories.forEach((c) => {
      let catStaff = staff.filter((s) => s.category_id === c.id);
      
      // Strictly filter out non-emergency doctors for the normal roster
      if (normalizeName(c.name) === "doctor") {
        catStaff = catStaff.filter((s) => {
          if (!s.department) return false;
          const dept = s.department.toLowerCase();
          return dept.includes("emerg") || dept.includes("emrg");
        });
      }
      
      map[c.id] = catStaff;
    });
    return map;
  }, [staff, rosterCategories]);

  const isAssigned = (staffId, shiftId) =>
    roster.some((r) => r.staff_id === staffId && r.shift_id === shiftId);

  const handleAssign = async (shiftId, staffId, options = {}) => {
    try {
      const payload = {
        roster_date: date,
        shift_id: shiftId,
        staff_id: staffId,
      };

      if (options.allow_duplicate) {
        payload.allow_duplicate = true;
      }

      await api.post("/roster", payload);
      toast.success("Staff assigned");
      fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error assigning staff");
    }
  };

  const handleRemove = async (rosterId) => {
    try {
      await api.delete(`/roster/${rosterId}`);
      toast.success("Assignment removed");
      fetchRoster();
    } catch {
      toast.error("Error removing assignment");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingExcel(true);
    try {
      const res = await api.post("/display/settings/import-monthly-duty", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message || "Schedule imported successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import schedule");
    } finally {
      setUploadingExcel(false);
      e.target.value = null; // reset input
    }
  };

  const handleCopyPrevious = async () => {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const from = prevDate.toISOString().split("T")[0];
    if (
      !window.confirm(
        `Copy roster from ${from} to ${date}? This will replace current assignments.`,
      )
    )
      return;
    try {
      await api.post("/roster/copy", { from_date: from, to_date: date });
      toast.success("Roster copied");
      fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error copying roster");
    }
  };

  const formatDate = (d) => {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isToday = date === new Date().toISOString().split("T")[0];
  const isLightTheme =
    document.documentElement.getAttribute("data-theme") === "light";

  const stickyCellStyle = isLightTheme
    ? {
      background: "rgba(248,250,252,0.95)",
      backdropFilter: "blur(8px)",
      borderRight: "1px solid rgba(148,163,184,0.35)",
    }
    : {
      background: "rgba(11,17,32,0.95)",
      backdropFilter: "blur(8px)",
    };

  const addSelectStyle = isLightTheme
    ? {
      background: "rgba(255,255,255,0.95)",
      borderColor: "rgba(148,163,184,0.55)",
      color: "#334155",
    }
    : {
      background: "rgba(11,17,32,0.3)",
      borderColor: "rgba(42,63,100,0.4)",
    };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Roster Management
          </h1>
          <p className="text-text-muted text-sm mt-1">Assign staff to shifts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-surface border border-border px-3 py-2 rounded-xl">
            <span className="text-xs text-text-secondary font-medium whitespace-nowrap">
              TV Layout:
            </span>
            <select
              value={displayLayout}
              onChange={(e) => handleLayoutChange(e.target.value)}
              disabled={savingLayout}
              className="bg-transparent text-sm text-text-primary focus:outline-none font-medium disabled:opacity-50"
            >
              <option value="casualty">Classic (All Staff)</option>
              <option value="doctors">Focus</option>
            </select>
          </div>
          <button
            onClick={handleCopyPrevious}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <HiOutlineDuplicate className="w-4 h-4" /> Copy Previous Day
          </button>
        </div>
      </div>

      {/* Date Picker */}
      <div
        className="flex items-center gap-3 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <button
          onClick={() => changeDate(-1)}
          className="p-2.5 rounded-xl bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card hover:border-border-light transition-all duration-200"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
          />
          <span className="text-text-secondary text-sm hidden md:block">
            {formatDate(date)}
          </span>
          {isToday && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(20,184,166,0.12)", color: "#14B8A6" }}
            >
              Today
            </span>
          )}
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-2.5 rounded-xl bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card hover:border-border-light transition-all duration-200"
        >
          <HiOutlineChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setDate(new Date().toISOString().split("T")[0])}
            className="text-primary-light text-sm hover:underline ml-1 font-medium"
          >
            Jump to Today
          </button>
        )}
      </div>

      {/* Monthly Duty Schedule Upload */}
      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(139, 92, 246, 0.12)" }}
          >
            <HiOutlineUpload className="w-4 h-4" style={{ color: "#8B5CF6" }} />
          </div>
          Monthly Night Supervisor Schedule
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 w-full">
            <label className="relative flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary-light/50 transition-colors cursor-pointer bg-bg-surface/50">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={uploadingExcel}
              />
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                {uploadingExcel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    Uploading & Parsing...
                  </>
                ) : (
                  <>
                    <HiOutlineUpload className="w-5 h-5 text-primary-light" />
                    <span className="font-medium text-text-primary">Click to upload</span> or drag and drop Excel file (.xlsx)
                  </>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Roster Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div
              className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3"
              style={{
                borderColor: "rgba(20,184,166,0.2)",
                borderTopColor: "#14B8A6",
              }}
            ></div>
            <p className="text-text-muted text-sm">Loading roster...</p>
          </div>
        </div>
      ) : (
        <div
          className="glass rounded-xl overflow-hidden animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-48 sticky left-0 z-10"
                    style={stickyCellStyle}
                  >
                    Category
                  </th>
                  {shifts.map((s, sIndex) => {
                    const colors = getShiftStyles(s, sIndex);
                    return (
                      <th key={s.id} className="text-center p-4 min-w-[220px]">
                        <span
                          className="font-display font-bold text-sm"
                          style={{ color: colors.text }}
                        >
                          {s.name}
                        </span>
                        <p className="text-text-muted text-xs mt-0.5">
                          {s.start_time?.slice(0, 5)} –{" "}
                          {s.end_time?.slice(0, 5)}
                        </p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rosterCategories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border/30">
                    <td
                      className="p-4 sticky left-0 z-10"
                      style={stickyCellStyle}
                    >
                      <span className="text-text-primary text-sm font-semibold">
                        {cat.name}
                      </span>
                    </td>
                    {shifts.map((shift, shiftIndex) => {
                      const isNightSupervisor =
                        normalizeName(cat.name) ===
                        normalizeName(NIGHT_SUPERVISOR_NAME);
                      const isNightShift =
                        normalizeName(shift.name) ===
                        normalizeName(NIGHT_SHIFT_NAME);
                      const isShiftAllowed = !isNightSupervisor || isNightShift;
                      const assigned = isShiftAllowed
                        ? getAssigned(cat.id, shift.id)
                        : [];
                      const available = isShiftAllowed
                        ? (staffByCategory[cat.id] || []).filter(
                          (s) => !isAssigned(s.id, shift.id),
                        )
                        : [];
                      const colors = getShiftStyles(shift, shiftIndex);
                      return (
                        <td key={shift.id} className="p-3 align-top">
                          <div className="space-y-2 min-h-[60px]">
                            {!isShiftAllowed && (
                              <div className="text-text-muted text-xs text-center py-4">
                                Night only
                              </div>
                            )}
                            {assigned.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 group transition-all duration-200"
                                style={{
                                  background: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                }}
                              >
                                <span className="text-text-primary text-sm">
                                  {r.staff_name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleRemove(r.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-200"
                                    style={{ color: "#EF4444" }}
                                    title="Remove"
                                  >
                                    <HiOutlineTrash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {available.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssign(
                                      shift.id,
                                      parseInt(e.target.value),
                                    );
                                    e.target.value = "";
                                  }
                                }}
                                className="w-full border border-dashed rounded-lg px-2 py-1.5 text-text-muted text-xs cursor-pointer transition-all duration-200 hover:border-primary-light/40"
                                style={addSelectStyle}
                                defaultValue=""
                              >
                                <option value="">+ Add {cat.name}</option>
                                {available.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.full_name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
