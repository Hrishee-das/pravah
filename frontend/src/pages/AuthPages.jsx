import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, setToken } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Button, Error_, Field, Input, Notice } from "../ui.jsx";

function Shell({ title, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6">
        <h1 className="mb-1 text-xl font-bold text-indigo-700">Brightloop</h1>
        <p className="mb-4 text-sm text-slate-500">{title}</p>
        {children}
        <div className="mt-4 text-center text-sm">{footer}</div>
      </div>
    </div>
  );
}

const useForm = (initial) => {
  const [f, setF] = useState(initial);
  return [f, (k) => (e) => setF({ ...f, [k]: e.target.value })];
};

const PW_HINT = "More than 8 characters, with an uppercase letter, a lowercase letter and a special character.";

export function Login() {
  const { login, user } = useAuth();
  const [f, set] = useForm({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(f.email, f.password);
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  };
  return (
    <Shell
      title="Log in to your account"
      footer={
        <>
          <Link className="text-indigo-600" to="/forgot-password">Forgot password?</Link>
          <span className="mx-2 text-slate-300">|</span>
          <Link className="text-indigo-600" to="/signup">Create account</Link>
        </>
      }
    >
      <form onSubmit={submit}>
        <Error_>{err}</Error_>
        <Field label="Email"><Input type="email" required value={f.email} onChange={set("email")} /></Field>
        <Field label="Password"><Input type="password" required value={f.password} onChange={set("password")} /></Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Logging in..." : "Log in"}</Button>
      </form>
    </Shell>
  );
}

export function Signup() {
  const { signup, user } = useAuth();
  const [f, set] = useForm({ name: "", email: "", company: "", phone: "", password: "", passwordConfirm: "" });
  const [err, setErr] = useState("");
  if (user) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await signup(f);
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <Shell title="Create your account" footer={<Link className="text-indigo-600" to="/login">Already have an account?</Link>}>
      <form onSubmit={submit}>
        <Error_>{err}</Error_>
        <Field label="Name"><Input required value={f.name} onChange={set("name")} /></Field>
        <Field label="Email"><Input type="email" required value={f.email} onChange={set("email")} /></Field>
        <Field label="Company (optional)"><Input value={f.company} onChange={set("company")} /></Field>
        <Field label="Phone (optional)"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Password" hint={PW_HINT}><Input type="password" required value={f.password} onChange={set("password")} /></Field>
        <Field label="Confirm password"><Input type="password" required value={f.passwordConfirm} onChange={set("passwordConfirm")} /></Field>
        <Button type="submit" className="w-full">Sign up</Button>
      </form>
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const r = await api.post("/users/forgotPassword", { email });
      setOk(r.message || "A reset link was sent to your email.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Reset your password" footer={<Link className="text-indigo-600" to="/login">Back to log in</Link>}>
      <form onSubmit={submit}>
        <Error_>{err}</Error_>
        <Notice>{ok}</Notice>
        <Field label="Registered email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending reset link..." : "Send reset link"}
        </Button>
      </form>
    </Shell>
  );
}

export function Reset() {
  const { token } = useParams();
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [f, set] = useForm({ password: "", passwordConfirm: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const resetToken = token?.trim();
      if (!resetToken) throw new Error("The password reset link is invalid.");
      const r = await api.patch(
        `/users/resetPassword/${encodeURIComponent(resetToken)}`,
        f,
      );
      if (r.token) {
        setToken(r.token);
        setUser(r.data.user);
      }
      nav("/");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit}>
        <Error_>{err}</Error_>
        <Field label="New password" hint={PW_HINT}><Input type="password" required value={f.password} onChange={set("password")} /></Field>
        <Field label="Confirm password"><Input type="password" required value={f.passwordConfirm} onChange={set("passwordConfirm")} /></Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving password..." : "Save password"}
        </Button>
      </form>
    </Shell>
  );
}
