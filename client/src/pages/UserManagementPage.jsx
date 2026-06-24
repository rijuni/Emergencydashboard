import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import SearchableSelect from "../components/common/SearchableSelect";

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [query, setQuery] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "admin",
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({
    username: "",
    full_name: "",
    role: "admin"
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      await fetchUsers();
      // load employee options for username selection
      try {
        const res = await api.get('/staff/master/employees?limit=1000');
        setEmployeeOptions(res.data.staff || []);
      } catch (err) {
        console.error('Failed to load employee options', err);
      }
      if (!isActive) return;
    };

    load();
    return () => {
      isActive = false;
    };
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.username || !newUser.password || !newUser.full_name) {
      toast.error("Username, full name and password are required");
      return;
    }

    setCreatingUser(true);
    try {
      await api.post("/auth/register", newUser);
      toast.success("User created successfully");
      setNewUser({
        username: "",
        password: "",
        full_name: "",
        role: "admin",
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUser = async (id) => {
    try {
      await api.put(`/auth/users/${id}/toggle`);
      toast.success("User status updated");
      fetchUsers();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update user status",
      );
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(
      `Enter a new temporary password for ${user.full_name}:`,
    );

    if (!newPassword) return;

    try {
      await api.put(`/auth/users/${user.id}/reset-password`, { newPassword });
      toast.success("Password reset successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setEditData({
      username: user.username,
      full_name: user.full_name,
      role: user.role
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveEdit = async () => {
    if (!editData.username || !editData.full_name) {
      toast.error("Username and full name are required");
      return;
    }

    try {
      await api.put(`/auth/users/${editingUserId}`, editData);
      toast.success("User updated successfully");
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [
      user.full_name,
      user.username,
      user.role === "super_admin" ? "super admin" : "admin",
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const searchableEmployeeOptions = useMemo(() => {
    return employeeOptions.map((emp) => ({
      id: emp.id,
      name: emp.employee_id,
      label: `${emp.employee_id} - ${emp.full_name}`,
    }));
  }, [employeeOptions]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            User Master
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Create and manage application users
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 animate-fade-in-up">
        <h2 className="text-base font-display font-semibold text-text-primary mb-5">
          Add New User
        </h2>

        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Full Name is auto-filled from selected Employee ID (read-only) */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Employee ID
            </label>
            <SearchableSelect
              options={searchableEmployeeOptions}
              value={newUser.username}
              onChange={(val) => {
                const found = employeeOptions.find((emp) => emp.employee_id === val);
                if (found) {
                  setNewUser({ ...newUser, username: found.employee_id, full_name: found.full_name });
                } else {
                  setNewUser({ ...newUser, username: val });
                }
              }}
              placeholder="Search Employee ID"
              searchPlaceholder="Search Employee ID or Name..."
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Full Name
            </label>
            <input
              type="text"
              value={newUser.full_name}
              readOnly
              className="w-full bg-bg-dark/70 border border-border rounded-xl px-4 py-3 text-text-muted text-sm"
              placeholder="Full name will be auto-filled"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Temporary Password
            </label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="Create temporary password"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Role
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              disabled={creatingUser}
            >
              {creatingUser ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>

      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <h2 className="text-base font-display font-semibold text-text-primary">
            Current Users
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-72 bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm"
            placeholder="Search name, username, role"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Username
                </th>
                <th className="text-left p-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Role
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
              {usersLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-text-muted text-sm"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-text-muted text-sm"
                  >
                    No users match your search
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200"
                  >
                    <td className="p-3 text-text-primary text-sm">
                      {editingUserId === user.id ? (
                        <input
                          type="text"
                          value={editData.full_name}
                          onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                          className="w-full bg-bg-dark border border-border rounded-lg px-2 py-1.5 text-text-primary text-sm"
                        />
                      ) : (
                        user.full_name
                      )}
                    </td>
                    <td className="p-3 text-text-secondary text-sm">
                      {editingUserId === user.id ? (
                        <input
                          type="text"
                          value={editData.username}
                          onChange={(e) => setEditData({...editData, username: e.target.value})}
                          className="w-full bg-bg-dark border border-border rounded-lg px-2 py-1.5 text-text-primary text-sm"
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td className="p-3 text-text-secondary text-sm">
                      {editingUserId === user.id ? (
                        <select
                          value={editData.role}
                          onChange={(e) => setEditData({...editData, role: e.target.value})}
                          className="w-full bg-bg-dark border border-border rounded-lg px-2 py-1.5 text-text-primary text-sm"
                        >
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        user.role === "super_admin" ? "Super Admin" : "Admin"
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${user.is_active ? "status-active" : "status-inactive"}`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {editingUserId === user.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="btn-primary px-3 py-1.5 rounded-lg text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleToggleUser(user.id)}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
                            disabled={user.role === "super_admin"}
                            title={
                              user.role === "super_admin"
                                ? "Super Admin accounts cannot be deactivated"
                                : undefined
                            }
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      )}
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
