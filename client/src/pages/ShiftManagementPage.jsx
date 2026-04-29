import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { HiOutlineClock } from "react-icons/hi";

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftSavingId, setShiftSavingId] = useState(null);
  const [newShift, setNewShift] = useState({
    name: "",
    start_time: "",
    end_time: "",
    display_order: "",
    is_active: true,
  });

  const fetchShifts = async () => {
    try {
      const res = await api.get("/roster/shifts?include_inactive=true");
      setShifts(res.data.shifts || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shifts");
    } finally {
      setShiftsLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      await fetchShifts();
      if (!isActive) return;
    };

    load();
    return () => {
      isActive = false;
    };
  }, []);

  const handleShiftFieldChange = (id, field, value) => {
    setShifts((prev) =>
      prev.map((shift) =>
        shift.id === id ? { ...shift, [field]: value } : shift,
      ),
    );
  };

  const handleSaveShift = async (shift) => {
    setShiftSavingId(shift.id);
    try {
      await api.put(`/roster/shifts/${shift.id}`, {
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        display_order: shift.display_order,
        is_active: shift.is_active,
      });
      toast.success("Shift updated");
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update shift");
    } finally {
      setShiftSavingId(null);
    }
  };

  const handleToggleShift = async (id) => {
    try {
      await api.put(`/roster/shifts/${id}/toggle`);
      toast.success("Shift status updated");
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update shift");
    }
  };

  const handleCreateShift = async (event) => {
    event.preventDefault();

    if (!newShift.name || !newShift.start_time || !newShift.end_time) {
      toast.error("Name, start time, and end time are required");
      return;
    }

    try {
      await api.post("/roster/shifts", {
        name: newShift.name,
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        display_order: newShift.display_order,
        is_active: newShift.is_active,
      });
      toast.success("Shift created");
      setNewShift({
        name: "",
        start_time: "",
        end_time: "",
        display_order: "",
        is_active: true,
      });
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create shift");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Shift Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage shift timings and activation
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 animate-fade-in-up">
        <h2 className="text-base font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(14,165,233,0.12)" }}
          >
            <HiOutlineClock className="w-4 h-4" style={{ color: "#0EA5E9" }} />
          </div>
          Add Shift
        </h2>

        <form
          onSubmit={handleCreateShift}
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
        >
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Shift Name
            </label>
            <input
              type="text"
              value={newShift.name}
              onChange={(e) =>
                setNewShift({ ...newShift, name: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="Morning"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Start Time
            </label>
            <input
              type="time"
              value={newShift.start_time}
              onChange={(e) =>
                setNewShift({ ...newShift, start_time: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              End Time
            </label>
            <input
              type="time"
              value={newShift.end_time}
              onChange={(e) =>
                setNewShift({ ...newShift, end_time: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Display Order
            </label>
            <input
              type="number"
              value={newShift.display_order}
              onChange={(e) =>
                setNewShift({ ...newShift, display_order: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="1"
              min="0"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              Add Shift
            </button>
          </div>
        </form>
      </div>

      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5">
          Current Shifts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Start
                </th>
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  End
                </th>
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {shiftsLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-text-muted text-sm"
                  >
                    Loading shifts...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-text-muted text-sm"
                  >
                    No shifts found
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr
                    key={shift.id}
                    className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200"
                  >
                    <td className="p-3">
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) =>
                          handleShiftFieldChange(
                            shift.id,
                            "name",
                            e.target.value,
                          )
                        }
                        className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="time"
                        value={shift.start_time?.slice(0, 5) || ""}
                        onChange={(e) =>
                          handleShiftFieldChange(
                            shift.id,
                            "start_time",
                            e.target.value,
                          )
                        }
                        className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="time"
                        value={shift.end_time?.slice(0, 5) || ""}
                        onChange={(e) =>
                          handleShiftFieldChange(
                            shift.id,
                            "end_time",
                            e.target.value,
                          )
                        }
                        className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={shift.display_order}
                        onChange={(e) =>
                          handleShiftFieldChange(
                            shift.id,
                            "display_order",
                            e.target.value,
                          )
                        }
                        className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                        min="0"
                      />
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${shift.is_active ? "status-active" : "status-inactive"}`}
                      >
                        {shift.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSaveShift(shift)}
                        className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                        disabled={shiftSavingId === shift.id}
                      >
                        {shiftSavingId === shift.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleShift(shift.id)}
                        className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                      >
                        {shift.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
