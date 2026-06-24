import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { HiOutlinePencil, HiOutlineUsers, HiOutlineSearch } from "react-icons/hi";
import { useAuth } from '../context/AuthContext';

export default function CategoryMasterPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryOrder, setNewCategoryOrder] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatOrder, setEditingCatOrder] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/staff/categories/all`);
      let data = res.data.categories || [];
      
      // Filter based on active/inactive status
      if (statusFilter === "active") {
        data = data.filter(c => c.is_active);
      } else if (statusFilter === "inactive") {
        data = data.filter(c => !c.is_active);
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        data = data.filter(c => c.name.toLowerCase().includes(query));
      }

      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [statusFilter, searchQuery]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/staff/categories", { 
        name: newCategoryName.trim(), 
        display_order: parseInt(newCategoryOrder, 10) || 0 
      });
      toast.success("Category created successfully");
      setNewCategoryName("");
      setNewCategoryOrder("");
      await fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    const confirmAction = window.confirm(`Do you really want to mark ${name} inactive?`);
    if (!confirmAction) return;
    try {
      await api.delete(`/staff/categories/${id}`);
      toast.success("Category deactivated");
      await fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deactivating category");
    }
  };

  const handleReactivate = async (id, name) => {
    const confirmAction = window.confirm(`Do you want to reactivate ${name}?`);
    if (!confirmAction) return;
    try {
      await api.put(`/staff/categories/${id}`, { is_active: true });
      toast.success("Category reactivated");
      await fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error reactivating category");
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatOrder(cat.display_order.toString());
  };

  const handleUpdateCategory = async (id) => {
    if (!editingCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      await api.put(`/staff/categories/${id}`, { 
        name: editingCatName.trim(), 
        display_order: parseInt(editingCatOrder, 10) || 0 
      });
      toast.success("Category updated successfully");
      setEditingCatId(null);
      setEditingCatName("");
      setEditingCatOrder("");
      await fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update category");
    }
  };

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setEditingCatName("");
    setEditingCatOrder("");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary animate-fade-in">
            Employee Category Master
          </h1>
          <p className="text-text-muted text-sm mt-1 animate-fade-in">
            Manage the list of employee categories (e.g. Nursing Officer, Doctor, etc.)
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 animate-fade-in-up">
        <h2 className="text-base font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: "rgba(20,184,166,0.12)" }}
          >
            <HiOutlineUsers className="w-4 h-4 text-primary-light" style={{ color: "#14B8A6" }} />
          </div>
          Add Category
        </h2>

        <form onSubmit={handleCreateCategory} className="flex gap-4 max-w-2xl">
          <div className="flex-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="e.g. Security Guard"
              required
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              value={newCategoryOrder}
              onChange={(e) => setNewCategoryOrder(e.target.value)}
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="Order"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all duration-300"
          >
            {submitting ? "Adding..." : "Add Category"}
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
              setSearchQuery(e.target.value);
            }}
            placeholder="Search categories..."
            className="w-full bg-bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-text-primary text-sm focus:border-primary-light transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          className="bg-bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm min-w-[140px]"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>

      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5">
          Categories List ({categories.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-16">
                  Order
                </th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Category Name
                </th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-24">
                  Status
                </th>
                <th className="text-right p-4 text-text-muted text-xs font-semibold uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-text-muted text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-t-transparent border-primary-light rounded-full animate-spin"></div>
                      Loading categories...
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-text-muted text-sm">
                    {searchQuery ? "No categories match your search." : "No categories found. Add one above."}
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200"
                  >
                    <td className="p-4 text-sm font-medium text-text-primary">
                      {editingCatId === cat.id ? (
                        <input
                          type="number"
                          value={editingCatOrder}
                          onChange={(e) => setEditingCatOrder(e.target.value)}
                          className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                        />
                      ) : (
                        cat.display_order
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium text-text-primary">
                      {editingCatId === cat.id ? (
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="w-full bg-bg-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                          autoFocus
                        />
                      ) : (
                        cat.name
                      )}
                    </td>
                    <td className="p-4">
                      {cat.is_active ? (
                        <button
                          onClick={() => handleDeactivate(cat.id, cat.name)}
                          className="text-xs px-2.5 py-1 rounded-full status-active hover:opacity-90"
                          title="Deactivate"
                        >
                          Active
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(cat.id, cat.name)}
                          className="text-xs px-2.5 py-1 rounded-full status-inactive hover:opacity-90"
                          title="Reactivate"
                        >
                          Inactive
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingCatId === cat.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(cat.id)}
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
                          <button
                            type="button"
                            onClick={() => handleEditCategory(cat)}
                            className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200"
                            title="Edit Category"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
