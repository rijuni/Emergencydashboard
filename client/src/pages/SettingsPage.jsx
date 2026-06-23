import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  HiOutlineSave,
  HiOutlineDesktopComputer,
  HiOutlineCheck
} from "react-icons/hi";
import SearchableSelect from "../components/common/SearchableSelect";

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
    security_supervisor_name: "",
    housekeeping_supervisor_name: "",
  });
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      try {
        const [settingsRes, staffRes, categoriesRes] = await Promise.all([
          api.get("/display/settings"),
          api.get("/staff?is_active=true"),
          api.get("/staff/categories"),
        ]);

        if (!isActive) return;
        setSettings((prev) => ({ ...prev, ...settingsRes.data.settings }));
        setStaff(staffRes.data.staff || []);
        setCategories(categoriesRes.data.categories || []);
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

  const securityCategory = useMemo(
    () => categories.find((c) => c.name?.toLowerCase() === "security supervisor"),
    [categories]
  );
  const securityOptions = useMemo(
    () =>
      staff
        .filter((s) => s.category_id === securityCategory?.id)
        .map((s) => s.full_name),
    [staff, securityCategory]
  );

  const hkCategory = useMemo(
    () => categories.find((c) => c.name?.toLowerCase() === "housekeeping supervisor"),
    [categories]
  );
  const hkOptions = useMemo(
    () =>
      staff
        .filter((s) => s.category_id === hkCategory?.id)
        .map((s) => s.full_name),
    [staff, hkCategory]
  );

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
              placeholder="KIMS Hospital"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">
              Display Title
            </label>
            <input
              type="text"
              value={settings.display_title || ""}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                Security Supervisor Name
              </label>
              <SearchableSelect
                options={securityOptions}
                value={settings.security_supervisor_name || ""}
                onChange={(val) =>
                  setSettings({ ...settings, security_supervisor_name: val })
                }
                placeholder="Select Security Supervisor..."
                searchPlaceholder="Search security supervisors..."
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                Housekeeping Supervisor Name
              </label>
              <SearchableSelect
                options={hkOptions}
                value={settings.housekeeping_supervisor_name || ""}
                onChange={(val) =>
                  setSettings({ ...settings, housekeeping_supervisor_name: val })
                }
                placeholder="Select Housekeeping Supervisor..."
                searchPlaceholder="Search housekeeping supervisors..."
              />
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
