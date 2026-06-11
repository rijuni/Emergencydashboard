import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { HiOutlineTrash, HiOutlineOfficeBuilding } from "react-icons/hi";

export default function DepartmentMasterPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      await fetchDepartments();
    };
    load();
    return () => {
      isActive = false;
    };
  }, []);

  const handleCreateDepartment = async (event) => {
    event.preventDefault();
    if (!newDepartmentName.trim()) {
      toast.error("Department name is required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/departments", { name: newDepartmentName.trim() });
      toast.success("Department created successfully");
      setNewDepartmentName("");
      await fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete department "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deleted successfully");
      await fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete department");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary animate-fade-in">
            Department Master
          </h1>
          <p className="text-text-muted text-sm mt-1 animate-fade-in">
            Manage the list of departments for the hospital
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 animate-fade-in-up">
        <h2 className="text-base font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: "rgba(20,184,166,0.12)" }}
          >
            <HiOutlineOfficeBuilding className="w-4 h-4 text-primary-light" style={{ color: "#14B8A6" }} />
          </div>
          Add Department
        </h2>

        <form onSubmit={handleCreateDepartment} className="flex gap-4 max-w-lg">
          <div className="flex-1">
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="e.g. Cardiology"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all duration-300"
          >
            {submitting ? "Adding..." : "Add Department"}
          </button>
        </form>
      </div>

      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5">
          Departments List ({departments.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-16">
                  #
                </th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Department Name
                </th>
                <th className="text-right p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-text-muted text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-t-transparent border-primary-light rounded-full animate-spin"></div>
                      Loading departments...
                    </div>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-text-muted text-sm">
                    No departments configured. Add one above.
                  </td>
                </tr>
              ) : (
                departments.map((dept, index) => (
                  <tr
                    key={dept.id}
                    className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200"
                  >
                    <td className="p-4 text-sm text-text-muted font-mono">
                      {index + 1}
                    </td>
                    <td className="p-4 text-sm font-medium text-text-primary">
                      {dept.name}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
                        title="Delete Department"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
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
