import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Layout from "./Layout.jsx";
import { Spinner } from "./ui.jsx";
import { Login, Signup, Forgot, Reset } from "./pages/AuthPages.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Home from "./pages/Home.jsx";
import {
  Products,
  Plans,
  Taxes,
  Discounts,
  Templates,
} from "./pages/Catalog.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import SubscriptionDetail from "./pages/SubscriptionDetail.jsx";
import Invoices from "./pages/Invoices.jsx";
import InvoiceDetail from "./pages/InvoiceDetail.jsx";
import Payments from "./pages/Payments.jsx";
import People from "./pages/People.jsx";
import Profile from "./pages/Profile.jsx";

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Landing() {
  const { isTeam } = useAuth();
  return isTeam ? <Dashboard /> : <Home />;
}

export default function App() {
  const team = ["admin", "staff"];
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<Forgot />} />
      <Route path="/reset-password/:token" element={<Reset />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={<Landing />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="products"
          element={
            <Guard roles={team}>
              <Products />
            </Guard>
          }
        />
        <Route
          path="plans"
          element={
            <Guard roles={team}>
              <Plans />
            </Guard>
          }
        />
        <Route
          path="taxes"
          element={
            <Guard roles={team}>
              <Taxes />
            </Guard>
          }
        />
        <Route
          path="discounts"
          element={
            <Guard roles={team}>
              <Discounts />
            </Guard>
          }
        />
        <Route
          path="templates"
          element={
            <Guard roles={team}>
              <Templates />
            </Guard>
          }
        />
        <Route
          path="customers"
          element={
            <Guard roles={team}>
              <People kind="customer" />
            </Guard>
          }
        />
        <Route
          path="staff"
          element={
            <Guard roles={["admin"]}>
              <People kind="staff" />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
