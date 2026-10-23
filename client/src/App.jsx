import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Bills from "./pages/Bills";
import Goals from "./pages/Goals";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SetupGuide from "./pages/SetupGuide";
import Debts from "./pages/Debts";
import SharedGroup from "./pages/SharedGroup";
import RecentlyDeleted from "./pages/RecentlyDeleted";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<SetupGuide />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/debts/groups/:id" element={<SharedGroup />} />
        <Route path="/recently-deleted" element={<RecentlyDeleted />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}