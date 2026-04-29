import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeeMasterPage from "./pages/EmployeeMasterPage";
import DoctorMasterPage from "./pages/DoctorMasterPage";
import RosterPage from "./pages/RosterPage";
import CertificatesPage from "./pages/CertificatesPage";
import SettingsPage from "./pages/SettingsPage";
import DisplayPage from "./pages/DisplayPage";
import UserManagementPage from "./pages/UserManagementPage";
import ShiftManagementPage from "./pages/ShiftManagementPage";
import DoctorsDisplayPage from "./pages/DoctorsDisplayPage";
import Layout from "./components/common/Layout";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-bg-dark">
        <div className="w-8 h-8 border-4 border-primary-light border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const getDefaultRouteByRole = (role) => {
  if (role === "casualty_incharge") return "/roster";
  return "/";
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/display/doctors" element={<DoctorsDisplayPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="staff"
          element={<Navigate to="/employee-master" replace />}
        />
        <Route
          path="employee-master"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <EmployeeMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="doctor-master"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <DoctorMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="roster"
          element={
            <RoleRoute allowedRoles={["casualty_incharge", "super_admin"]}>
              <RosterPage />
            </RoleRoute>
          }
        />
        <Route
          path="certificates"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <CertificatesPage />
            </RoleRoute>
          }
        />
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <UserManagementPage />
            </RoleRoute>
          }
        />
        <Route
          path="shifts"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <ShiftManagementPage />
            </RoleRoute>
          }
        />
        <Route
          path="settings"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <SettingsPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1E293B",
              color: "#F8FAFC",
              border: "1px solid #334155",
            },
            success: {
              iconTheme: { primary: "#22C55E", secondary: "#F8FAFC" },
            },
            error: { iconTheme: { primary: "#EF4444", secondary: "#F8FAFC" } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
