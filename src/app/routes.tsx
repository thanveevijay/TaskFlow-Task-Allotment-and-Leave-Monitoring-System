import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ManagerDashboard from "./pages/ManagerDashboard";
import TaskManagement from "./pages/TaskManagement";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import LeaveManagement from "./pages/LeaveManagement";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Employees from "./pages/Employees";
import AuditTrail from "./pages/AuditTrail";
import OrgChart from "./pages/OrgChart";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/manager",
    element: <Layout role="manager" />,
    children: [
      { path: "dashboard",      element: <ManagerDashboard /> },
      { path: "tasks",          element: <TaskManagement /> },
      { path: "employees",      element: <Employees /> },
      { path: "leave-requests", element: <LeaveManagement /> },
      { path: "reports",        element: <Reports /> },
      { path: "settings",       element: <Settings /> },
      { path: "audit",          element: <AuditTrail /> },
      { path: "org-chart",      element: <OrgChart /> },
    ],
  },
  {
    path: "/employee",
    element: <Layout role="employee" />,
    children: [
      { path: "dashboard", element: <EmployeeDashboard /> },
      { path: "tasks",     element: <TaskManagement /> },
      { path: "leave",     element: <LeaveManagement /> },
      { path: "settings",  element: <Settings /> },
      { path: "org-chart", element: <OrgChart /> },
    ],
  },
]);
