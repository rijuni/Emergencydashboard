import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDuplicate,
  HiOutlinePencil,
  HiOutlineUpload,
  HiOutlineDocumentDownload,
  HiOutlineCalendar
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
  "Manager On Duty",
];
const NIGHT_SUPERVISOR_NAME = "Manager On Duty";
const NIGHT_SHIFT_NAME = "Night";
const normalizeName = (value) => (value || "").trim().toLowerCase();

export default function RosterPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roster, setRoster] = useState([]);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [manualModName, setManualModName] = useState("");
  const [savingManualMod, setSavingManualMod] = useState(false);
  const [restoringMod, setRestoringMod] = useState(false);
  const [activeFileName, setActiveFileName] = useState("");
  const [overrideCategory, setOverrideCategory] = useState("MOD");
  const [overrideShiftId, setOverrideShiftId] = useState("");
  const [overrideStaffId, setOverrideStaffId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("mod");
  const [editingRosterId, setEditingRosterId] = useState(null);

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
      if (settingsRes.data.settings?.active_mod_schedule_filename) {
        setActiveFileName(settingsRes.data.settings.active_mod_schedule_filename);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const [rosterRes, displayRes] = await Promise.all([
        api.get(`/roster?date=${date}`),
        api.get(`/display/today?date=${date}`)
      ]);
      setRoster(rosterRes.data.roster);
      setManualModName(displayRes.data.nightSupervisorName || "");
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
      if (options.emergency_override) {
        payload.emergency_override = true;
      }
      if (options.is_override) {
        payload.is_override = true;
      }

      await api.post("/roster", payload);
      toast.success("Staff assigned");
      fetchRoster();
    } catch (err) {
      if (err.response?.data?.errorCode === 'STAFF_ALREADY_ASSIGNED_TODAY') {
        if (window.confirm(err.response.data.message)) {
          handleAssign(shiftId, staffId, { ...options, emergency_override: true });
        }
      } else {
        toast.error(err.response?.data?.message || "Error assigning staff");
      }
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

  const handleUpdateAssignment = async (rosterId, newStaffId) => {
    try {
      await api.put(`/roster/${rosterId}`, { staff_id: newStaffId });
      toast.success("Assignment updated");
      fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating assignment");
    }
  };

  const handleUpdateStaffName = async (staffId, newName) => {
    try {
      await api.put(`/staff/${staffId}`, { full_name: newName });
      toast.success("Staff name updated");
      fetchRoster();
      fetchMeta();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating staff name");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sanitize the filename to remove weird characters like Â
    const cleanFileName = file.name.replace(/Â/g, '').replace(/\s+/g, ' ').trim();

    // Validation: Confirm before uploading the same file again
    if (activeFileName && cleanFileName === activeFileName) {
      const confirmUpload = window.confirm(
        `You have already uploaded "${cleanFileName}". Are you sure you want to upload it again?`
      );
      if (!confirmUpload) {
        e.target.value = null; // discard and reset input
        return;
      }
    }

    const cleanFileNameLower = cleanFileName.toLowerCase();
    
    // Strict Template Validation
    if (uploadCategory === "doctors" && !cleanFileNameLower.includes("doctor")) {
      toast.error("Invalid file: Please upload a Doctors Roster Template.");
      e.target.value = null; return;
    }
    if (uploadCategory === "mod" && !cleanFileNameLower.includes("manager_on_duty") && !cleanFileNameLower.includes("mod")) {
      toast.error("Invalid file: Please upload a Manager On Duty Template.");
      e.target.value = null; return;
    }
    if (uploadCategory === "nursing" && !cleanFileNameLower.includes("nursing")) {
      toast.error("Invalid file: Please upload a Nursing Roster Template.");
      e.target.value = null; return;
    }
    if (uploadCategory === "pharmacy" && !cleanFileNameLower.includes("pharmacy")) {
      toast.error("Invalid file: Please upload a Pharmacy Roster Template.");
      e.target.value = null; return;
    }

    // We can remove the "coming soon" block now that we are building the backend!

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", uploadCategory);
    const selectedDate = new Date(date);
    formData.append("year", selectedDate.getFullYear());
    formData.append("month", selectedDate.getMonth() + 1);

    setUploadingExcel(true);
    try {
      const res = await api.post("/display/settings/import-monthly-duty", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message || "Schedule imported successfully!");
      setActiveFileName(cleanFileName); // Only update filename in UI if upload succeeded
      fetchRoster(); // Refresh the roster data automatically after successful upload
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import schedule");
    } finally {
      setUploadingExcel(false);
      e.target.value = null; // reset input
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await api.get('/display/settings/download-mod-schedule', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', activeFileName || 'Manager_On_Duty_Schedule.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download schedule or no schedule available.');
    }
  };

  const handleDownloadTemplate = async () => {
    const type = document.getElementById('template-select')?.value;
    if (!type) {
      toast.error("Please select a template to download");
      return;
    }
    try {
      const res = await api.get(`/files/templates/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const typeNames = {
        'mod': 'Manager_On_Duty_Template.xlsx',
        'doctors': 'Doctors_Roster_Template.xlsx',
        'pharmacy': 'Pharmacy_Roster_Template.xlsx',
        'nursing': 'Nursing_Roster_Template.xlsx'
      };
      
      link.setAttribute('download', typeNames[type]);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download template");
    }
  };

  const handleManualModSave = async () => {
    setSavingManualMod(true);
    try {
      await api.post("/display/settings/manual-mod", { date, staff_name: manualModName });
      if (!manualModName.trim()) {
        toast.success("Manager On Duty cleared successfully for " + formatDate(date));
      } else {
        toast.success("Manual Manager On Duty updated successfully for " + formatDate(date));
      }
      fetchRoster(); // Refetch to show the latest saved value
      handleDownloadModSchedule(); // Auto-download updated schedule
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save override");
    } finally {
      setSavingManualMod(false);
    }
  };

  const handleRestoreDefault = async () => {
    setRestoringMod(true);
    try {
      const formattedDate = date;
      const res = await api.post("/display/settings/restore-mod", { date: formattedDate });
      toast.success(res.data.message || "Restored default Manager On Duty");
      fetchRoster(); // Refresh to show restored name
      handleDownloadModSchedule(); // Auto-download updated schedule
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to restore default Manager On Duty");
    } finally {
      setRestoringMod(false);
    }
  };

  const handleCopyPrevious = async () => {
    if (isPastDate) return toast.error("Cannot copy into a past date");
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

  const getTodayLocalString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const isPastDate = date < getTodayLocalString();

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
          <button
            onClick={handleCopyPrevious}
            disabled={isPastDate}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPastDate ? "Cannot copy into a past date" : "Copy previous day's roster"}
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
        className="glass-card rounded-xl overflow-hidden animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <div className="p-5 border-b border-border bg-bg-surface/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <HiOutlineCalendar className="w-5 h-5 text-primary" />
            Monthly Manager On Duty Schedule & Overrides
          </h2>
        </div>
        <div className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full flex flex-col gap-2">
            <select 
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value)}
              className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary-light/50 mb-1"
            >
              <option value="mod">Manager On Duty Schedule</option>
              <option value="doctors">Doctors Roster</option>
              <option value="nursing">Nursing Officer Roster</option>
              <option value="pharmacy">Pharmacist Roster</option>
            </select>
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
            
            {/* Template Download Section */}
            <div className="flex items-center gap-2 mt-1 w-full">
              <select 
                id="template-select"
                defaultValue=""
                className="flex-1 bg-bg-dark border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary-light/50"
              >
                <option value="" disabled>Select a template...</option>
                <option value="mod">MOD Template</option>
                <option value="doctors">Doctors Template</option>
                <option value="pharmacy">Pharmacy Template</option>
                <option value="nursing">Nursing Template</option>
              </select>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 bg-primary/10 text-primary-light rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <HiOutlineDocumentDownload className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
          <div className="flex-1 w-full flex flex-col justify-center h-full">
            <div className="p-4 rounded-xl border border-border bg-bg-surface/30">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Manual Override for {formatDate(date)}
              </label>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={overrideCategory}
                    onChange={e => {
                      setOverrideCategory(e.target.value);
                      setOverrideShiftId("");
                      setOverrideStaffId("");
                    }}
                    className="flex-1 bg-bg-dark border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-light/50 disabled:opacity-50"
                    disabled={savingManualMod || isPastDate}
                  >
                    <option value="MOD">Manager On Duty</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nursing Officer">Nursing Officer</option>
                    <option value="Pharmacist">Pharmacist</option>
                  </select>

                  {overrideCategory !== "MOD" && (
                    <select
                      value={overrideShiftId}
                      onChange={e => setOverrideShiftId(e.target.value)}
                      className="flex-1 bg-bg-dark border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-light/50 disabled:opacity-50"
                      disabled={isPastDate}
                    >
                      <option value="" disabled>Select Shift...</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {overrideCategory === "MOD" ? (
                    <input
                      type="text"
                      placeholder="Enter Manager On Duty Name"
                      value={manualModName}
                      onChange={(e) => setManualModName(e.target.value)}
                      className="flex-1 bg-bg-dark border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-light/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={savingManualMod || isPastDate}
                    />
                  ) : (
                    <select
                      value={overrideStaffId}
                      onChange={e => setOverrideStaffId(e.target.value)}
                      className="flex-1 bg-bg-dark border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-light/50 disabled:opacity-50"
                      disabled={isPastDate || !overrideShiftId}
                    >
                      <option value="" disabled>Select Staff...</option>
                      {staff.filter(s => {
                        const cat = categories.find(c => c.id === s.category_id);
                        return cat && normalizeName(cat.name) === normalizeName(overrideCategory);
                      }).map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => {
                      if (overrideCategory === "MOD") {
                        handleManualModSave();
                      } else {
                        if (!overrideShiftId || !overrideStaffId) {
                          toast.error("Please select both a shift and a staff member");
                          return;
                        }
                        handleAssign(parseInt(overrideShiftId), parseInt(overrideStaffId), { is_override: true });
                        setOverrideStaffId(""); // reset staff after assignment
                      }
                    }}
                    disabled={savingManualMod || restoringMod || isPastDate}
                    className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title={isPastDate ? "Cannot edit past dates" : "Save Override"}
                  >
                    {savingManualMod ? "Saving..." : "Save Override"}
                  </button>
                  {overrideCategory === "MOD" && activeFileName && (
                    <button
                      onClick={handleRestoreDefault}
                      disabled={savingManualMod || restoringMod || isPastDate}
                      className="btn-outline border-border px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-primary-light hover:border-primary-light disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      title={isPastDate ? "Cannot edit past dates" : "Restore original name from Excel"}
                    >
                      {restoringMod ? "Restoring..." : "Restore Default"}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-muted mt-3">
                Select a category to manually assign a staff member outside of the standard schedule.
              </p>
            </div>
          </div>
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
                                {editingRosterId === r.id ? (
                                  <div className="flex items-center gap-1 w-full">
                                    <input
                                      autoFocus
                                      defaultValue={r.staff_name}
                                      id={`edit-staff-input-${r.id}`}
                                      className="w-full bg-transparent border-b border-primary-light text-sm focus:outline-none text-text-primary px-1"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newName = e.target.value.trim();
                                          if (newName && newName !== r.staff_name) {
                                            handleUpdateStaffName(r.staff_id, newName);
                                          }
                                          setEditingRosterId(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingRosterId(null);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        const input = document.getElementById(`edit-staff-input-${r.id}`);
                                        if (input) {
                                          const newName = input.value.trim();
                                          if (newName && newName !== r.staff_name) {
                                            handleUpdateStaffName(r.staff_id, newName);
                                          }
                                        }
                                        setEditingRosterId(null);
                                      }}
                                      className="text-primary hover:text-primary-light p-1 font-bold"
                                      title="Save"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => setEditingRosterId(null)}
                                      className="text-text-muted hover:text-danger p-1 text-xs"
                                      title="Cancel"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-text-primary text-sm">
                                      {r.staff_name}
                                    </span>
                                    {!isPastDate && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => setEditingRosterId(r.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-200 text-text-muted hover:text-primary-light"
                                          title="Edit"
                                        >
                                          <HiOutlinePencil className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                            {!isPastDate && available.length > 0 && (
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
