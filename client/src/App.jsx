import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeeMasterPage from "./pages/EmployeeMasterPage";
import DoctorMasterPage from "./pages/DoctorMasterPage";
import DepartmentMasterPage from "./pages/DepartmentMasterPage";
import CategoryMasterPage from "./pages/CategoryMasterPage";
import RosterPage from "./pages/RosterPage";
import CertificatesPage from "./pages/CertificatesPage";
import SettingsPage from "./pages/SettingsPage";
import DisplayPage from "./pages/DisplayPage";
import UserManagementPage from "./pages/UserManagementPage";
import ShiftManagementPage from "./pages/ShiftManagementPage";
import FileArchivesPage from "./pages/FileArchivesPage";
import OnCallDoctorDutyPage from "./pages/OnCallDoctorDutyPage";
import Layout from "./components/common/Layout";
import ChangePasswordPage from "./pages/ChangePasswordPage";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-bg-dark">
        <div className="w-8 h-8 border-4 border-primary-light border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};

const getDefaultRouteByRole = (role) => {
  if (role === "admin") return "/";
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
      <Route path="/opendisplay" element={<DisplayPage />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
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
            <RoleRoute allowedRoles={["super_admin","admin"]}>
              <EmployeeMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="doctor-master"
          element={
            <RoleRoute allowedRoles={["super_admin","admin"]}>
              <DoctorMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="department-master"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <DepartmentMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="category-master"
          element={
            <RoleRoute allowedRoles={["super_admin","admin"]}>
              <CategoryMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="roster"
          element={
            <RoleRoute allowedRoles={["admin", "super_admin"]}>
              <RosterPage />
            </RoleRoute>
          }
        />
        <Route
          path="on-call-duty"
          element={
            <RoleRoute allowedRoles={["admin", "super_admin"]}>
              <OnCallDoctorDutyPage />
            </RoleRoute>
          }
        />
        <Route
          path="certificates"
          element={
            <RoleRoute allowedRoles={["super_admin","admin"]}>
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
          path="files"
          element={
            <RoleRoute allowedRoles={["super_admin","admin"]}>
              <FileArchivesPage />
            </RoleRoute>
          }
        />
        <Route
          path="settings"
          element={
            <RoleRoute allowedRoles={["super_admin","admin"]}>
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
