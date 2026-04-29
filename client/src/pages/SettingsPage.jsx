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
    ambulance_contact_number: "",
    ambulance_contact_details: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      try {
        const settingsRes = await api.get("/display/settings");

        if (!isActive) return;
        setSettings((prev) => ({ ...prev, ...settingsRes.data.settings }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load settings data");
      } finally {
        if (isActive) {
          setLoading(false);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                Ambulance Contact Number
              </label>
              <input
                type="text"
                value={settings.ambulance_contact_number}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ambulance_contact_number: e.target.value,
                  })
                }
                className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
                placeholder="108 or 555-0142"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                Ambulance Details
              </label>
              <input
                type="text"
                value={settings.ambulance_contact_details}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ambulance_contact_details: e.target.value,
                  })
                }
                className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
                placeholder="Vehicle KA-01-AB-1234"
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
            className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group bg-bg-card/50 border border-border hover:border-primary-light/20"
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
          <a
            href="/display/doctors"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group bg-bg-card/50 border border-border hover:border-primary-light/20"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(14,165,233,0.12)" }}
            >
              <HiOutlineDesktopComputer
                className="w-5 h-5"
                style={{ color: "#0EA5E9" }}
              />
            </div>
            <div className="flex-1">
              <p className="text-text-primary text-sm font-medium group-hover:text-primary-light transition-colors">
                Open Doctor Availability Display
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                Show only doctors on duty in a new tab
              </p>
            </div>
            <span className="text-text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
