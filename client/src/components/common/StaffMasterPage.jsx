import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
} from "react-icons/hi";

export default function StaffMasterPage({
  mode,
  title,
  subtitle,
  addButtonLabel,
  listEndpoint,
  emptyStateMessage,
  enableBulkAdd = false,
}) {
  const isDoctorMode = mode === "doctor";
  const tableColumnCount = isDoctorMode ? 9 : 7;

  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [bulkDesignation, setBulkDesignation] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    category_id: "",
    branch: "PBMH",
    department: "",
    unit: "",
    designation: "",
    qualification: "",
    specialization: "",
    registration_number: "",
    phone: "",
    email: "",
  });

  const doctorCategory = useMemo(
    () =>
      categories.find((category) => category.name?.toLowerCase() === "doctor"),
    [categories],
  );

  const selectableCategories = useMemo(() => {
    if (isDoctorMode) {
      return doctorCategory ? [doctorCategory] : [];
    }
    return categories.filter(
      (category) => category.name?.toLowerCase() !== "doctor",
    );
  }, [categories, doctorCategory, isDoctorMode]);

  useEffect(() => {
    let isActive = true;
    const loadCategories = async () => {
      try {
        const res = await api.get("/staff/categories");
        if (!isActive) return;
        setCategories(res.data.categories);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load categories");
      }
    };

    loadCategories();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadDepartments = async () => {
      try {
        const res = await api.get("/departments");
        if (!isActive) return;
        setDepartments(res.data.departments || []);
      } catch (error) {
        console.error("Failed to load departments:", error);
      }
    };

    loadDepartments();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadStaff = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (!isDoctorMode && filterCategory)
          params.append("category_id", filterCategory);
        params.append("is_active", "true");
        params.append("page", String(currentPage));
        params.append("limit", "10");
        const res = await api.get(`${listEndpoint}?${params.toString()}`);
        if (!isActive) return;
        setStaff(res.data.staff || []);
        setTotalRecords(Number(res.data.pagination?.total || 0));
        setTotalPages(Number(res.data.pagination?.totalPages || 0));
      } catch (error) {
        console.error(error);
        toast.error("Failed to load master data");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadStaff();

    return () => {
      isActive = false;
    };
  }, [
    currentPage,
    filterCategory,
    isDoctorMode,
    listEndpoint,
    reloadKey,
    search,
  ]);

  const pageRange = useMemo(() => {
    if (totalRecords === 0) return "0-0";
    const pageSize = 10;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);
    return `${start}-${end}`;
  }, [currentPage, totalRecords]);

  const openModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setForm({
        full_name: staffMember.full_name,
        category_id: staffMember.category_id,
        branch: staffMember.branch || "PBMH",
        department: staffMember.department || "",
        unit: staffMember.unit || "",
        designation: staffMember.designation || "",
        qualification: staffMember.qualification || "",
        specialization: staffMember.specialization || "",
        registration_number: staffMember.registration_number || "",
        phone: staffMember.phone || "",
        email: staffMember.email || "",
      });
    } else {
      setEditingStaff(null);
      setForm({
        full_name: "",
        category_id: selectableCategories[0]?.id || "",
        branch: "PBMH",
        department: "",
        unit: "",
        designation: "",
        qualification: "",
        specialization: "",
        registration_number: "",
        phone: "",
        email: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.full_name) {
      toast.error("Name is required");
      return;
    }

    if (isDoctorMode && !form.designation) {
      toast.error("Designation is required for doctors");
      return;
    }

    let payload = { ...form };

    if (isDoctorMode) {
      if (!doctorCategory?.id) {
        toast.error(
          "Doctor category not found. Please configure categories first.",
        );
        return;
      }
      payload.category_id = doctorCategory.id;
    } else if (!payload.category_id) {
      toast.error("Category is required");
      return;
    }

    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, payload);
        toast.success("Record updated");
      } else {
        await api.post("/staff", payload);
        toast.success("Record added");
      }
      setShowModal(false);
      setReloadKey((current) => current + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving record");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;

    try {
      await api.delete(`/staff/${id}`);
      toast.success("Record deactivated");
      setReloadKey((current) => current + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deactivating record");
    }
  };

  const handleBulkSubmit = async (event) => {
    event.preventDefault();

    if (!doctorCategory?.id) {
      toast.error(
        "Doctor category not found. Please configure categories first.",
      );
      return;
    }

    const parsedNames = bulkNames
      .split(/\r?\n|,/)
      .map((name) => name.trim())
      .filter(Boolean);

    if (parsedNames.length === 0) {
      toast.error("Please enter at least one doctor name.");
      return;
    }

    const trimmedDesignation = bulkDesignation.trim();
    if (!trimmedDesignation) {
      toast.error("Designation is required for doctors");
      return;
    }

    const staffList = parsedNames.map((full_name) => ({
      full_name,
      category_id: doctorCategory.id,
      designation: trimmedDesignation,
    }));

    setBulkSaving(true);
    try {
      await api.post("/staff/bulk", { staffList });
      toast.success(`${staffList.length} doctors added successfully.`);
      setShowBulkModal(false);
      setBulkNames("");
      setBulkDesignation("");
      setReloadKey((current) => current + 1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Error adding multiple doctors",
      );
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            {title}
          </h1>
          <p className="text-text-muted text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {enableBulkAdd && isDoctorMode && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            >
              <HiOutlinePlus className="w-4 h-4" /> Add Multiple Doctors
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <HiOutlinePlus className="w-4 h-4" /> {addButtonLabel}
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-3 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-md group">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-light transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setCurrentPage(1);
              setSearch(event.target.value);
            }}
            placeholder={
              isDoctorMode
                ? "Search by name, department, specialization or license no..."
                : "Search by name, designation or employee number..."
            }
            className="w-full bg-bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50"
          />
        </div>

        {!isDoctorMode && (
          <select
            value={filterCategory}
            onChange={(event) => {
              setCurrentPage(1);
              setFilterCategory(event.target.value);
            }}
            className="bg-bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm min-w-[180px]"
          >
            <option value="">All Employee Categories</option>
            {selectableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        className="glass rounded-xl overflow-hidden animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Category
                </th>
                {isDoctorMode && (
                  <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                    Department
                  </th>
                )}
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                  Designation
                </th>
                {isDoctorMode && (
                  <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                    Specialisation
                  </th>
                )}
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                  {isDoctorMode ? "License No" : "Employee No."}
                </th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                  Phone
                </th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableColumnCount} className="text-center py-16">
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="w-5 h-5 border-2 rounded-full animate-spin"
                        style={{
                          borderColor: "rgba(20,184,166,0.2)",
                          borderTopColor: "#14B8A6",
                        }}
                      ></div>
                      <span className="text-text-muted text-sm">
                        Loading records...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="text-center py-16 text-text-muted text-sm"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : (
                staff.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200 animate-stagger-in"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.05))",
                            color: "#14B8A6",
                          }}
                        >
                          {item.full_name.charAt(0)}
                        </div>
                        <span className="text-text-primary text-sm font-medium">
                          {item.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: "rgba(59,130,246,0.1)",
                          color: "#93C5FD",
                        }}
                      >
                        {item.category_name}
                      </span>
                    </td>
                    {isDoctorMode && (
                      <td className="p-4 text-text-secondary text-sm hidden md:table-cell">
                        {item.department || "—"}
                      </td>
                    )}
                    <td className="p-4 text-text-secondary text-sm hidden md:table-cell">
                      {item.designation || "—"}
                    </td>
                    {isDoctorMode && (
                      <td className="p-4 text-text-secondary text-sm hidden lg:table-cell">
                        {item.specialization || "—"}
                      </td>
                    )}
                    <td className="p-4 text-text-muted text-sm font-mono hidden lg:table-cell">
                      {item.registration_number || "—"}
                    </td>
                    <td className="p-4 text-text-secondary text-sm hidden lg:table-cell">
                      {item.phone || "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${item.is_active ? "status-active" : "status-inactive"}`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(item)}
                          className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.full_name)}
                          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
                          title="Deactivate"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-nowrap">
          <div className="text-xs text-text-muted whitespace-nowrap mr-auto">
            Showing {pageRange} of {totalRecords} records
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in"
            onClick={(event) => event.stopPropagation()}
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-text-primary">
                {editingStaff ? `Edit ${title}` : addButtonLabel}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-all duration-200"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({ ...form, full_name: event.target.value })
                    }
                    className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    Category *
                  </label>
                  {isDoctorMode ? (
                    <input
                      type="text"
                      value={doctorCategory?.name || "Doctor"}
                      className="w-full bg-bg-dark/70 border border-border rounded-xl px-4 py-2.5 text-text-muted text-sm"
                      disabled
                    />
                  ) : (
                    <select
                      value={form.category_id}
                      onChange={(event) =>
                        setForm({ ...form, category_id: event.target.value })
                      }
                      className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                      required
                    >
                      <option value="">Select</option>
                      {selectableCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {isDoctorMode && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={form.branch}
                      onChange={(event) =>
                        setForm({ ...form, branch: event.target.value })
                      }
                      className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                    />
                  </div>
                )}

                {isDoctorMode && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                      Department
                    </label>
                    <select
                      value={form.department}
                      onChange={(event) =>
                        setForm({ ...form, department: event.target.value })
                      }
                      className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isDoctorMode && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(event) =>
                        setForm({ ...form, unit: event.target.value })
                      }
                      className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(event) =>
                      setForm({ ...form, designation: event.target.value })
                    }
                    placeholder="e.g. Senior Resident"
                    className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50"
                    required={isDoctorMode}
                  />
                </div>

                {isDoctorMode && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={form.qualification}
                      onChange={(event) =>
                        setForm({ ...form, qualification: event.target.value })
                      }
                      className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                    />
                  </div>
                )}

                {isDoctorMode && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                      Specialisation
                    </label>
                    <input
                      type="text"
                      value={form.specialization}
                      onChange={(event) =>
                        setForm({ ...form, specialization: event.target.value })
                      }
                      className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    {isDoctorMode ? "License No" : "Employee Number"}
                  </label>
                  <input
                    type="text"
                    value={form.registration_number}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        registration_number: event.target.value,
                      })
                    }
                    className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold"
                >
                  {editingStaff ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="glass-strong rounded-2xl w-full max-w-xl p-6 animate-scale-in"
            onClick={(event) => event.stopPropagation()}
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-text-primary">
                Add Multiple Doctors
              </h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-all duration-200"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                  Doctor Names (one per line or comma separated) *
                </label>
                <textarea
                  rows={8}
                  value={bulkNames}
                  onChange={(event) => setBulkNames(event.target.value)}
                  placeholder={"Dr. A Kumar\nDr. B Singh\nDr. C Verma"}
                  className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm placeholder-text-muted/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                  Common Designation (optional)
                </label>
                <input
                  type="text"
                  value={bulkDesignation}
                  onChange={(event) => setBulkDesignation(event.target.value)}
                  placeholder="e.g. Senior Resident"
                  className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {bulkSaving ? "Saving..." : "Save Multiple Doctors"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
