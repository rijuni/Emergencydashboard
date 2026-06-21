import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { HiOutlinePencil, HiOutlineOfficeBuilding, HiOutlineSearch } from "react-icons/hi";
import { useAuth } from '../context/AuthContext';

export default function DepartmentMasterPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'super_admin';
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 10;

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/departments?is_active=${statusFilter === "active" ? "true" : "false"}&page=${currentPage}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`
      );
      setDepartments(res.data.departments || []);
      setTotalRecords(res.data.pagination?.totalRecords || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [statusFilter, currentPage, searchQuery]);

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

  const handleDeactivate = async (id, name) => {
    const confirmAction = window.confirm(`Do you really want to mark ${name} inactive?`);
    if (!confirmAction) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deactivated");
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: false } : d)));
      if (statusFilter === "active") setStatusFilter("inactive");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deactivating department");
    }
  };

  const handleReactivate = async (id, name) => {
    const confirmAction = window.confirm(`Do you want to reactivate ${name}?`);
    if (!confirmAction) return;
    try {
      await api.put(`/departments/${id}/reactivate`, {});
      toast.success("Department reactivated");
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: true } : d)));
      if (statusFilter === "inactive") setStatusFilter("active");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error reactivating department");
    }
  };

  const handleEditDepartment = (dept) => {
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
  };

  const handleUpdateDepartment = async (id) => {
    if (!editingDeptName.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await api.put(`/departments/${id}`, { name: editingDeptName.trim() });
      toast.success("Department updated successfully");
      setEditingDeptId(null);
      setEditingDeptName("");
      await fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update department");
    }
  };

  const handleCancelEdit = () => {
    setEditingDeptId(null);
    setEditingDeptName("");
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
        className="flex flex-wrap gap-3 animate-fade-in-up items-center"
        style={{ animationDelay: "100ms" }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiOutlineSearch className="w-5 h-5 text-text-muted" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setCurrentPage(1);
              setSearchQuery(e.target.value);
            }}
            placeholder="Search departments..."
            className="w-full bg-bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-text-primary text-sm focus:border-primary-light transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setCurrentPage(1);
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          className="bg-bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm min-w-[140px]"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5">
          Departments List ({totalRecords})
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
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-20">
                  Status
                </th>
                <th className="text-right p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-24">
                  {/* reserved for actions icons */}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-text-muted text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-t-transparent border-primary-light rounded-full animate-spin"></div>
                      Loading departments...
                    </div>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-text-muted text-sm">
                    {searchQuery ? "No departments match your search." : "No departments configured. Add one above."}
                  </td>
                </tr>
              ) : (
                departments.map((dept, index) => (
                  <tr
                    key={dept.id}
                    className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200"
                  >
                    <td className="p-4 text-sm text-text-muted font-mono">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="p-4 text-sm font-medium text-text-primary">
                      {editingDeptId === dept.id ? (
                        <input
                          type="text"
                          value={editingDeptName}
                          onChange={(e) => setEditingDeptName(e.target.value)}
                          className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                          autoFocus
                        />
                      ) : (
                        dept.name
                      )}
                    </td>
                    <td className="p-4">
                      {dept.is_active ? (
                        <button
                          onClick={() => handleDeactivate(dept.id, dept.name)}
                          className="text-xs px-2.5 py-1 rounded-full status-active hover:opacity-90"
                          title="Deactivate"
                        >
                          Active
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(dept.id, dept.name)}
                          className="text-xs px-2.5 py-1 rounded-full status-inactive hover:opacity-90"
                          title="Reactivate"
                        >
                          Inactive
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingDeptId === dept.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateDepartment(dept.id)}
                              className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditDepartment(dept)}
                              className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200"
                              title="Edit Department"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            {/* Deactivate button removed from actions - deactivation is available via Status button */}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-nowrap border-t border-border/30 mt-4">
          <div className="text-xs text-text-muted whitespace-nowrap mr-auto">
            Showing {totalRecords === 0 ? "0" : `${(currentPage - 1) * limit + 1}-${Math.min(currentPage * limit, totalRecords)}`} of {totalRecords} records
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={loading || currentPage <= 1 || totalPages === 0}
              className="px-3 py-1.5 rounded-lg text-xs border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            <span className="text-xs text-text-secondary min-w-[72px] text-center">
              Page {totalPages === 0 ? 0 : currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages || 1, page + 1))
              }
              disabled={
                loading ||
                totalPages === 0 ||
                currentPage >= totalPages
              }
              className="px-3 py-1.5 rounded-lg text-xs border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
