import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function Layout() {
  const { user, logout, isTeam, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    ["/", isTeam ? "Dashboard" : "Home"],
    ["/subscriptions", "Subscriptions"],
    ["/invoices", "Invoices"],
    ["/payments", "Payments"],
  ];
  if (isTeam) {
    links.push(["/customers", "Customers"], ["/products", "Products"], ["/plans", "Plans"], ["/templates", "Quotation templates"], ["/taxes", "Taxes"], ["/discounts", "Discounts"]);
  }
  if (isAdmin) links.push(["/staff", "Staff"]);
  links.push(["/profile", "My profile"]);

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between bg-indigo-700 px-4 py-3 text-white md:hidden">
        <span className="font-semibold">Pravah</span>
        <button onClick={() => setOpen(!open)}>☰</button>
      </header>
      <aside
        className={`${open ? "block" : "hidden"} w-full shrink-0 bg-white md:block md:min-h-screen md:w-56 md:border-r`}
      >
        <div className="hidden px-4 py-4 text-lg font-bold text-indigo-700 md:block">Pravah</div>
        <nav className="flex flex-col gap-0.5 px-2 pb-2">
          {links.map(([to, text]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="border-t px-4 py-3 text-xs text-slate-500">
          <div className="font-medium text-slate-700">{user.name}</div>
          <div className="capitalize">{user.role}</div>
          <button onClick={logout} className="mt-2 text-indigo-600 hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
