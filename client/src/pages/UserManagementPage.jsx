import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [query, setQuery] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "casualty_incharge",
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
        role: "casualty_incharge",
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

  const filteredUsers = users.filter((user) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [
      user.full_name,
      user.username,
      user.role === "super_admin" ? "super admin" : "casualty head",
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

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
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Full Name
            </label>
            <input
              type="text"
              value={newUser.full_name}
              onChange={(e) =>
                setNewUser({ ...newUser, full_name: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="Casualty Department Head"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Username
            </label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="head.casualty"
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
              <option value="casualty_incharge">Casualty Head</option>
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
                      {user.full_name}
                    </td>
                    <td className="p-3 text-text-secondary text-sm">
                      {user.username}
                    </td>
                    <td className="p-3 text-text-secondary text-sm">
                      {user.role === "super_admin"
                        ? "Super Admin"
                        : "Casualty Head"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${user.is_active ? "status-active" : "status-inactive"}`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="btn-secondary px-3 py-1.5 rounded-lg text-xs mr-2"
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
