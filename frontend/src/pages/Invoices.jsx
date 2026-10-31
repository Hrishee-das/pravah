import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, list } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Badge, Button, Error_, Notice, PageHeader, Pager, Select, Table, date, label, money, useFetch } from "../ui.jsx";

const TABS = [
  ["", "All"],
  ["outstanding", "Outstanding"],
  ["overdue", "Overdue"],
];

export default function Invoices() {
  const { isTeam } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "";
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const limit = 20;

  const { data, error, reload } = useFetch(
    () => list(`/invoices${tab ? "/" + tab : ""}`, { page, limit, sort: "-issueDate", status: tab ? "" : status }),
    [tab, page, status]
  );

  const generate = async () => {
    if (!confirm("Run billing day now? Invoices are created for every subscription that is due.")) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api.post("/invoices/generate-due", { autoConfirm: false });
      const s = r.data || {};
      setMsg(
        "Billing run finished. " +
          Object.entries(s).filter(([, v]) => typeof v === "number").map(([k, v]) => `${label(k.replace(/([A-Z])/g, " $1").toLowerCase())}: ${v}`).join(" · ")
      );
      reload();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div>
      <PageHeader title={isTeam ? "Invoices" : "My invoices"}>
        {isTeam && <Button onClick={generate} disabled={busy}>{busy ? "Running..." : "Generate due invoices"}</Button>}
      </PageHeader>
      <Error_>{err || error}</Error_>
      <Notice>{msg}</Notice>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TABS.map(([k, t]) => (
          <button
            key={k}
            onClick={() => { setPage(1); setSp(k ? { tab: k } : {}); }}
            className={`rounded-full px-3 py-1 text-sm ${tab === k ? "bg-indigo-600 text-white" : "bg-white border text-slate-600"}`}
          >
            {t}
          </button>
        ))}
        {!tab && (
          <Select
            placeholder="Any status"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            options={["draft", "confirmed", "paid", "cancelled"].map((s) => ({ value: s, label: s }))}
          />
        )}
      </div>
      <div className="rounded-lg border bg-white">
        <Table
          onRowClick={(r) => nav(`/invoices/${r._id}`)}
          columns={[
            { header: "Number", render: (r) => <span className="font-medium text-indigo-600">{r.number}</span> },
            ...(isTeam ? [{ header: "Customer", render: (r) => r.customer?.name }] : []),
            { header: "Subscription", render: (r) => r.subscription?.number },
            { header: "Issued", render: (r) => date(r.issueDate) },
            { header: "Due", render: (r) => date(r.dueDate) },
            { header: "Status", render: (r) => <Badge value={r.isOverdue ? "overdue" : r.status} /> },
            { header: "Total", right: true, render: (r) => money(r.total) },
            { header: "Due amount", right: true, render: (r) => money(r.amountDue) },
          ]}
          rows={data?.rows || []}
        />
      </div>
      <Pager page={page} limit={limit} total={data?.total || 0} onPage={setPage} />
    </div>
  );
}
