import { useState } from "react";
import { list, api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Button, Error_, Field, Input, Modal, PageHeader, Pager, Table, date, useFetch } from "../ui.jsx";

const PW_HINT = "More than 8 characters, with uppercase, lowercase and a special character.";

// kind = "customer" (admin + staff, read-only) or "staff" (admin only, can add)
export default function People({ kind }) {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", passwordConfirm: "" });
  const [err, setErr] = useState("");
  const limit = 20;

  const { data, error, reload } = useFetch(
    () => list("/users", { role: kind, page, limit, sort: "name", ...(search ? { name: search } : {}) }),
    [kind, page, search]
  );

  const save = async () => {
    setErr("");
    try {
      await api.post("/users/staff", f);
      setModal(false);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <PageHeader title={kind === "staff" ? "Staff" : "Customers"}>
        <Input placeholder="Search exact name" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        {kind === "staff" && isAdmin && <Button onClick={() => setModal(true)}>+ Add staff</Button>}
      </PageHeader>
      <Error_>{error}</Error_>
      <div className="rounded-lg border bg-white">
        <Table
          columns={[
            { header: "Name", key: "name" },
            { header: "Email", key: "email" },
            { header: "Company", render: (r) => r.company || "-" },
            { header: "Phone", render: (r) => r.phone || "-" },
          ]}
          rows={data?.rows || []}
        />
      </div>
      <Pager page={page} limit={limit} total={data?.total || 0} onPage={setPage} />
      {modal && (
        <Modal title="Add staff member" onClose={() => setModal(false)}>
          <Error_>{err}</Error_>
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Password" hint={PW_HINT}><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Confirm password"><Input type="password" value={f.passwordConfirm} onChange={(e) => setF({ ...f, passwordConfirm: e.target.value })} /></Field>
          <Button onClick={save}>Create staff</Button>
        </Modal>
      )}
    </div>
  );
}
