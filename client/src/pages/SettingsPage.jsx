import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  HiOutlineSave,
  HiOutlineDesktopComputer,
  HiOutlineCog,
  HiOutlineCheck,
} from "react-icons/hi";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    hospital_name: "",
    code_blue: "",
    display_title: "",
    auto_refresh_seconds: "30",
    night_mode_start: "22:00",
    night_mode_end: "06:00",
  });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "casualty_incharge",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      try {
        const [settingsRes, usersRes] = await Promise.all([
          api.get("/display/settings"),
          api.get("/auth/users"),
        ]);

        if (!isActive) return;
        setSettings((prev) => ({ ...prev, ...settingsRes.data.settings }));
        setUsers(usersRes.data.users || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load settings data");
      } finally {
        if (isActive) {
          setLoading(false);
          setUsersLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/display/settings", { settings });
      toast.success("Settings saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div
            className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: "rgba(20,184,166,0.2)",
              borderTopColor: "#14B8A6",
            }}
          ></div>
          <p className="text-text-muted text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Settings
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Configure display and system settings
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          id="save-settings-btn"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${saved ? "bg-success text-white" : "btn-primary"} disabled:opacity-50`}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : saved ? (
            <HiOutlineCheck className="w-4 h-4" />
          ) : (
            <HiOutlineSave className="w-4 h-4" />
          )}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Display Settings */}
      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.12)" }}
          >
            <HiOutlineDesktopComputer
              className="w-4 h-4"
              style={{ color: "#14B8A6" }}
            />
          </div>
          Display Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Hospital Name
            </label>
            <input
              type="text"
              value={settings.hospital_name}
              onChange={(e) =>
                setSettings({ ...settings, hospital_name: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="District Hospital"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Display Title
            </label>
            <input
              type="text"
              value={settings.display_title}
              onChange={(e) =>
                setSettings({ ...settings, display_title: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
              placeholder="CASUALTY DEPARTMENT"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                Code Blue Number
              </label>
              <input
                type="text"
                value={settings.code_blue}
                onChange={(e) =>
                  setSettings({ ...settings, code_blue: e.target.value })
                }
                className="w-full bg-bg-dark border rounded-xl px-4 py-3 text-text-primary text-lg font-mono font-bold text-center"
                style={{ borderColor: "rgba(239,68,68,0.2)" }}
                placeholder="33"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                Auto-refresh (seconds)
              </label>
              <input
                type="number"
                value={settings.auto_refresh_seconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_refresh_seconds: e.target.value,
                  })
                }
                className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
                min="10"
                max="300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Night Mode Settings */}
      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.12)" }}
          >
            <HiOutlineCog className="w-4 h-4" style={{ color: "#3B82F6" }} />
          </div>
          Night Mode
          <span className="text-xs font-normal text-text-muted ml-1">
            (dims display during set hours)
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Start Time
            </label>
            <input
              type="time"
              value={settings.night_mode_start}
              onChange={(e) =>
                setSettings({ ...settings, night_mode_start: e.target.value })
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
              value={settings.night_mode_end}
              onChange={(e) =>
                setSettings({ ...settings, night_mode_end: e.target.value })
              }
              className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "300ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-4">
          Quick Links
        </h2>
        <div className="space-y-3">
          <a
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group hover:border-primary-light/20"
            style={{
              background: "rgba(11,17,32,0.4)",
              border: "1px solid rgba(30,45,74,0.3)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <HiOutlineDesktopComputer
                className="w-5 h-5"
                style={{ color: "#F59E0B" }}
              />
            </div>
            <div className="flex-1">
              <p className="text-text-primary text-sm font-medium group-hover:text-primary-light transition-colors">
                Open Public Display
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                Open the full-screen display in a new tab
              </p>
            </div>
            <span className="text-text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </a>
        </div>
      </div>

      {/* User Master */}
      <div
        className="glass-card rounded-xl p-6 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}
      >
        <h2 className="text-base font-display font-semibold text-text-primary mb-5">
          User Master
        </h2>

        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
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
                  Action
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
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-text-muted text-sm"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
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
                        onClick={() => handleToggleUser(user.id)}
                        className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
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
