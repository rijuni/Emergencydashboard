import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HiOutlineViewGrid,
  HiOutlineUsers,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineCog,
  HiOutlineDesktopComputer,
  HiOutlineLogout,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineClock,
  HiOutlineIdentification,
  HiOutlineArchive,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";
import kimsLogo from "../../assets/kims-logo.png";

const navItemsByRole = {
  super_admin: [
    { to: "/", icon: HiOutlineViewGrid, label: "Dashboard", end: true },
    { to: "/employee-master", icon: HiOutlineUsers, label: "Employee Master" },
    { to: "/doctor-master", icon: HiOutlineUsers, label: "Doctor Directory" },
    { to: "/department-master", icon: HiOutlineOfficeBuilding, label: "Department Master" },
    { to: "/roster", icon: HiOutlineCalendar, label: "Roster Duty" },
    { to: "/on-call-duty", icon: HiOutlineIdentification, label: "On Call Duty" },
    { to: "/certificates", icon: HiOutlineDocumentText, label: "Certificates" },
    { to: "/files", icon: HiOutlineArchive, label: "File Archives" },
    { to: "/users", icon: HiOutlineUsers, label: "User Master" },
    { to: "/shifts", icon: HiOutlineClock, label: "Shift Management" },
    { to: "/settings", icon: HiOutlineCog, label: "Settings" },
  ],
  admin: [
    { to: "/", icon: HiOutlineViewGrid, label: "Dashboard", end: true },
    { to: "/employee-master", icon: HiOutlineUsers, label: "Employee Master" },
    { to: "/doctor-master", icon: HiOutlineUsers, label: "Doctor Directory" },
    { to: "/roster", icon: HiOutlineCalendar, label: "Roster Duty" },
    { to: "/on-call-duty", icon: HiOutlineIdentification, label: "On Call Duty" },
    { to: "/certificates", icon: HiOutlineDocumentText, label: "Certificates" },
    { to: "/files", icon: HiOutlineArchive, label: "File Archives" },
    { to: "/settings", icon: HiOutlineCog, label: "Settings" },
  ],
};

const roleLabelByKey = {
  super_admin: "Super Admin",
  admin: "Admin",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );
  const navItems =
    navItemsByRole[user?.role] || navItemsByRole.admin;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] sidebar-gradient border-r border-border flex flex-col shrink-0 relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-primary-light/40 to-transparent"></div>

        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(148,163,184,0.25)",
              }}
            >
              <img
                src={kimsLogo}
                alt="KIMS logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-text-primary text-sm tracking-wide">
                Emergency
              </h1>
              <p className="text-primary-light/60 text-xs font-medium tracking-wider uppercase">
                Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${
                    isActive
                      ? "nav-item-active"
                      : "text-text-secondary hover:bg-bg-card/60 hover:text-text-primary"
                  }`
                }
              >
                <IconComponent className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {item.label}
              </NavLink>
            );
          })}

          <div className="pt-3 mt-3 border-t border-border">
            <a
              href="/display"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group"
              style={{ color: "#F59E0B" }}
            >
              <HiOutlineDesktopComputer className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span>Open Display</span>
              <span
                className="ml-auto w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#F59E0B" }}
              ></span>
            </a>
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg-card/40 transition-all duration-300">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold relative shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.05))",
                color: "#14B8A6",
              }}
            >
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.full_name}
              </p>
              <p className="text-xs text-text-muted">
                {roleLabelByKey[user?.role] || user?.role?.replace("_", " ")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-300"
                title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              >
                {theme === "dark" ? (
                  <HiOutlineSun className="w-4 h-4" />
                ) : (
                  <HiOutlineMoon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-300"
                title="Logout"
              >
                <HiOutlineLogout className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-bg-dark relative">
        {/* Subtle ambient background glow */}
        <div
          className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.03] pointer-events-none"
          style={{
            background: "radial-gradient(circle, #14B8A6, transparent 70%)",
          }}
        ></div>
        <Outlet />
      </main>
    </div>
  );
}
