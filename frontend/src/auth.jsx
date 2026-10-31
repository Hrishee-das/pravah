import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api
      .get("/users/me")
      .then((r) => setUser(r.data.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/users/login", { email, password });
    setToken(r.token);
    setUser(r.data.user);
  };
  const signup = async (body) => {
    const r = await api.post("/users/signup", body);
    setToken(r.token);
    setUser(r.data.user);
  };
  const logout = async () => {
    try {
      await api.get("/users/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isTeam = isAdmin || isStaff;

  return (
    <Ctx.Provider
      value={{ user, setUser, loading, login, signup, logout, isAdmin, isStaff, isTeam }}
    >
      {children}
    </Ctx.Provider>
  );
}
