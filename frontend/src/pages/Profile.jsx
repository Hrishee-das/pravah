import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Button, Card, Error_, Field, Input, Notice, PageHeader } from "../ui.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [p, setP] = useState({ name: user.name || "", phone: user.phone || "", company: user.company || "", address: user.address || "" });
  const [pw, setPw] = useState({ passwordCurrent: "", password: "", passwordConfirm: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const run = async (fn, ok) => {
    setMsg("");
    setErr("");
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="My profile" />
      <Error_>{err}</Error_>
      <Notice>{msg}</Notice>
      <Card title="Details" className="mb-4">
        <p className="mb-3 text-sm text-slate-500">{user.email}</p>
        {["name", "phone", "company", "address"].map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
            <Input value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
          </Field>
        ))}
        <Button onClick={() => run(async () => setUser((await api.patch("/users/updateMe", p)).data.user), "Profile updated.")}>
          Save
        </Button>
      </Card>
      <Card title="Change password">
        <Field label="Current password"><Input type="password" value={pw.passwordCurrent} onChange={(e) => setPw({ ...pw, passwordCurrent: e.target.value })} /></Field>
        <Field label="New password" hint="More than 8 characters, with uppercase, lowercase and a special character.">
          <Input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
        </Field>
        <Field label="Confirm new password"><Input type="password" value={pw.passwordConfirm} onChange={(e) => setPw({ ...pw, passwordConfirm: e.target.value })} /></Field>
        <Button onClick={() => run(async () => { await api.patch("/users/updateMyPassword", pw); setPw({ passwordCurrent: "", password: "", passwordConfirm: "" }); }, "Password changed.")}>
          Update password
        </Button>
      </Card>
    </div>
  );
}
