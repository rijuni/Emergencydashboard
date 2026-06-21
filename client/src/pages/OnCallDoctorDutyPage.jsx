import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDuplicate,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineInformationCircle,
  HiOutlineCalendar
} from "react-icons/hi";
import { useAuth } from '../context/AuthContext';
import SearchableSelect from "../components/common/SearchableSelect";


export default function OnCallDoctorDutyPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'super_admin';
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roster, setRoster] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [doctorCategoryId, setDoctorCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single Form State for the entire day
  const [selection, setSelection] = useState({ department: "", doctorId: "" });

  const fetchMeta = useCallback(async () => {
    try {
      const [staffRes, catRes, shiftRes, deptRes] = await Promise.all([
        api.get("/staff?is_active=true"),
        api.get("/staff/categories"),
        api.get("/roster/shifts"),
        api.get("/departments?is_active=true"),
      ]);
      setStaff(staffRes.data.staff);
      setShifts(shiftRes.data.shifts);
      setActiveDepartments(deptRes.data.departments || []);

      const docCategory = catRes.data.categories.find(
        (c) => c.name.toLowerCase() === "doctor"
      );
      if (docCategory) setDoctorCategoryId(docCategory.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load metadata.");
    }
  }, []);

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
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const changeDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
    // clear selection when date changes
    setSelection({ department: "", doctorId: "" });
  };

  const handleCopyPrevious = async () => {
    if (isPastDate) return toast.error("Cannot copy into a past date");
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const from = prevDate.toISOString().split("T")[0];
    if (
      !window.confirm(
        `Copy roster from ${from} to ${date}? This will replace current assignments.`
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

  const isToday = date === new Date().toISOString().split("T")[0];

  const getTodayLocalString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const isPastDate = date < getTodayLocalString();

  // Derive Doctors and Departments
  const doctors = useMemo(() => {
    if (!doctorCategoryId) return [];
    return staff.filter((s) => s.category_id === doctorCategoryId);
  }, [staff, doctorCategoryId]);

  const activeDepartmentNames = useMemo(
    () =>
      new Set(
        activeDepartments
          .map((department) => (department.name || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    [activeDepartments]
  );

  const departments = useMemo(() => {
    const deps = new Set(
      doctors
        .map((d) => (d.department || "").trim().toUpperCase())
        .filter(Boolean)
        .filter((dept) => activeDepartmentNames.has(dept))
        .filter((dept) => {
          const lower = dept.toLowerCase();
          return lower !== "emergency medicine" && lower !== "emrgency medicine";
        })
    );
    return Array.from(deps).sort();
  }, [activeDepartmentNames, doctors]);

  // Derived Selection State
  const availableDoctors = doctors.filter((d) => {
    const department = (d.department || "").trim().toUpperCase();
    return department === selection.department && activeDepartmentNames.has(department);
  });
  const selectedDoctor = doctors.find((d) => d.id === parseInt(selection.doctorId));

  // Get unique assigned doctors for the day
  const assignedDoctors = useMemo(() => {
    const docs = roster.filter(r => 
      r.category_name?.toLowerCase() === "doctor" && 
      r.notes === "ON_CALL"
    );
    const uniqueDocsMap = new Map();
    docs.forEach(d => uniqueDocsMap.set(d.staff_id, d));
    return Array.from(uniqueDocsMap.values());
  }, [roster]);

  // Handlers
  const updateSelection = (field, value) => {
    setSelection((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "department" ? { doctorId: "" } : {}),
    }));
  };

  const handleAddDoctor = async () => {
    if (!selection.doctorId) return toast.error("Please select a doctor first.");

    try {
      // Assign the doctor to all shifts for the day so they appear "Day Wise" on the TV display
      await Promise.all(
        shifts.map(shift =>
          api.post("/roster", {
            roster_date: date,
            shift_id: shift.id,
            staff_id: parseInt(selection.doctorId),
            notes: "ON_CALL",
            allow_duplicate: true
          }).catch(err => {
            // Ignore duplicate entry errors if they are already assigned
            if (err.response?.status !== 400 && err.response?.status !== 409) {
              throw err;
            }
          })
        )
      );
      toast.success("Doctor assigned for the entire day");
      setSelection({ department: "", doctorId: "" });
      fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error assigning doctor");
    }
  };

  const handleRemoveDoctor = async (staffId) => {
    try {
      // Remove all roster entries for this staff on this day
      const entriesToDelete = roster.filter(r => r.staff_id === staffId);
      await Promise.all(
        entriesToDelete.map(r => api.delete(`/roster/${r.id}`))
      );
      toast.success("Doctor removed from the day's roster");
      fetchRoster();
    } catch {
      toast.error("Error removing assignment");
    }
  };

  // Render components
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            On Call Doctor Duty
          </h1>
          <p className="text-text-muted text-sm mt-1">Assign doctor for the entire day</p>
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
      <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
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
            {new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
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
      </div>

      {/* Main Cards Area */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 rounded-full animate-spin border-primary-light/20 border-t-primary-light"></div>
        </div>
      ) : (
        <div className="max-w-2xl animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div
            className="rounded-2xl p-6 flex flex-col h-full"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "2px solid rgba(14,165,233,0.3)",
              boxShadow: "inset 0 0 40px rgba(14,165,233,0.05)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <HiOutlineCalendar className="w-8 h-8" style={{ color: "#0EA5E9" }} />
              <div>
                <h2 className="font-display font-bold text-lg" style={{ color: "#0EA5E9" }}>
                  24-Hour On Call Duty
                </h2>
                <p className="text-text-muted text-sm font-medium">
                  Assigned doctors will be on-call and visible on the TV display all day.
                </p>
              </div>
            </div>

            {/* Assignment Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-text-muted text-sm font-medium mb-1.5">Department</label>
                <SearchableSelect
                  options={departments}
                  value={selection.department}
                  onChange={(val) => updateSelection("department", val)}
                  placeholder="Select Department..."
                  searchPlaceholder="Search departments..."
                  disabled={isPastDate}
                />
              </div>
              <div>
                <label className="block text-text-muted text-sm font-medium mb-1.5">Doctor</label>
                <select
                  value={selection.doctorId}
                  onChange={(e) => updateSelection("doctorId", e.target.value)}
                  disabled={!selection.department || isPastDate}
                  className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-primary-light transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Doctor...</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Doctor Preview */}
            <div className="min-h-[80px] mb-4">
              {selectedDoctor ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-bg-dark/50">
                  <div className="w-10 h-10 rounded-full border-2 border-primary-light flex items-center justify-center text-primary-light shrink-0">
                    <HiOutlineUser className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-text-primary font-bold text-sm truncate">{selectedDoctor.full_name}</h4>
                    <p className="text-text-muted text-xs truncate">{selectedDoctor.department}</p>
                    <p className="text-text-muted text-xs truncate">{(selectedDoctor.qualification || '') + (selectedDoctor.specialization ? `, ${selectedDoctor.specialization}` : '')}</p>
                  </div>
                  {!isPastDate && canDelete && (
                    <button
                      onClick={() => updateSelection("doctorId", "")}
                      className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                      title="Clear selection"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-full rounded-xl border border-dashed border-border flex items-center justify-center text-text-muted text-sm">
                  No doctor selected
                </div>
              )}
            </div>

            <button
              onClick={handleAddDoctor}
              disabled={!selectedDoctor || isPastDate}
              className="w-full py-3 rounded-xl font-bold text-sm bg-primary-light text-bg-dark hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-6"
              title={isPastDate ? "Cannot edit past dates" : ""}
            >
              + Add Doctor
            </button>

            {/* Assigned Doctors */}
            <div className="mt-auto pt-6 border-t border-border/50 space-y-3">
              <h3 className="text-text-muted text-sm font-medium">Assigned Doctors for Today</h3>
              {assignedDoctors.length > 0 ? (
                <div className="space-y-3">
                  {assignedDoctors.map((r) => (
                    <div key={r.staff_id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-bg-dark/30 hover:border-primary-light/50 transition-colors">
                      <div className="w-10 h-10 rounded-full border-2 border-primary-light flex items-center justify-center text-primary-light shrink-0">
                        <HiOutlineUser className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-text-primary font-bold text-sm truncate">{r.staff_name}</h4>
                        <p className="text-text-muted text-xs truncate">{doctors.find(d => d.id === r.staff_id)?.department || 'Department'}</p>
                      </div>
                      {!isPastDate && canDelete && (
                        <button
                          onClick={() => handleRemoveDoctor(r.staff_id)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                          title="Remove assignment"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-4">No doctors assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="mt-8 p-4 rounded-xl bg-bg-surface border border-border flex gap-4 items-start animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <div className="w-8 h-8 rounded-full bg-secondary-light/20 flex items-center justify-center text-secondary-light shrink-0">
          <HiOutlineInformationCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-text-primary font-bold text-sm mb-1">Note</h4>
          <p className="text-text-muted text-sm">
            Doctors assigned here will automatically be rostered for all shifts on this day, ensuring they remain visible on the TV display for the entire 24-hour period.
          </p>
        </div>
      </div>
    </div>
  );
}
