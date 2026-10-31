import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../api.js";
import { Badge, Card, Error_, Field, Input, PageHeader, Select, Spinner, Table, date, label, money, useFetch } from "../ui.jsx";

const Stat = ({ title, value, sub, tone = "" }) => (
  <div className="rounded-lg border bg-white p-4">
    <div className="text-xs uppercase text-slate-500">{title}</div>
    <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
    {sub && <div className="text-xs text-slate-500">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [interval, setInterval_] = useState("month");

  const { data, error, loading } = useFetch(async () => {
    const [d, r] = await Promise.all([
      api.get("/reports/dashboard" + qs({ from, to })),
      api.get("/reports/revenue" + qs({ from, to, interval })),
    ]);
    return { d: d.data, series: r.data.series };
  }, [from, to, interval]);

  const d = data?.d;
  const max = Math.max(1, ...(data?.series || []).map((s) => s.amount));

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
        <div><Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
        <div>
          <Field label="Chart interval">
            <Select value={interval} onChange={(e) => setInterval_(e.target.value)} options={[{ value: "day", label: "Daily" }, { value: "month", label: "Monthly" }]} />
          </Field>
        </div>
      </div>
      <Error_>{error}</Error_>
      {loading && !d && <Spinner />}
      {d && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat title="Active subscriptions" value={d.subscriptions.active} sub={`${d.subscriptions.paused} paused`} />
            <Stat title="MRR" value={money(d.recurringRevenue.mrr)} sub={`ARR ${money(d.recurringRevenue.arr)}`} />
            <Stat title="Revenue collected" value={money(d.revenue.collected.amount)} sub={`${d.revenue.collected.count} payments`} tone="text-green-700" />
            <Stat title="Invoiced" value={money(d.revenue.invoiced.amount)} sub={`${d.revenue.invoiced.count} invoices`} />
            <Stat title="Outstanding" value={money(d.outstanding.amount)} sub={`${d.outstanding.count} invoices`} tone="text-amber-700" />
            <Stat title="Overdue" value={money(d.overdue.amount)} sub={`${d.overdue.count} invoices`} tone="text-red-700" />
            {Object.entries(d.subscriptions.byStatus || {}).slice(0, 2).map(([k, v]) => (
              <Stat key={k} title={`${label(k)} subscriptions`} value={v} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Revenue collected">
              {data.series.length === 0 ? (
                <p className="text-sm text-slate-500">No payments in this period.</p>
              ) : (
                <div className="space-y-1">
                  {data.series.map((s) => (
                    <div key={s.date} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-slate-500">{s.date}</span>
                      <div className="h-4 flex-1 rounded bg-slate-100">
                        <div className="h-4 rounded bg-indigo-500" style={{ width: `${(s.amount / max) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right">{money(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Collected by method">
              <Table
                columns={[
                  { header: "Method", render: (r) => <span className="capitalize">{label(r.method)}</span> },
                  { header: "Payments", key: "count" },
                  { header: "Amount", right: true, render: (r) => money(r.amount) },
                ]}
                rows={d.revenue.collectedByMethod}
              />
            </Card>

            <Card title="Overdue aging">
              <Table
                columns={[
                  { header: "Bucket", key: "bucket" },
                  { header: "Invoices", key: "count" },
                  { header: "Amount", right: true, render: (r) => money(r.amount) },
                ]}
                rows={d.overdue.aging}
                empty="No overdue invoices."
              />
            </Card>

            <Card title="Recent payments">
              <Table
                columns={[
                  { header: "Date", render: (r) => date(r.paymentDate) },
                  { header: "Customer", render: (r) => r.customer?.name || r.customerName || "-" },
                  { header: "Method", render: (r) => label(r.method) },
                  { header: "Amount", right: true, render: (r) => money(r.amount) },
                ]}
                rows={d.recentPayments || []}
              />
            </Card>
          </div>

          <Card title="Overdue invoices" className="mt-4" actions={<Link className="text-sm text-indigo-600" to="/invoices?tab=overdue">View all</Link>}>
            <Table
              columns={[
                { header: "Invoice", render: (r) => <Link className="text-indigo-600" to={`/invoices/${r._id}`}>{r.number}</Link> },
                { header: "Customer", render: (r) => r.customer?.name || r.customerDetails?.name || r.customerName || "-" },
                { header: "Due", render: (r) => date(r.dueDate) },
                { header: "Status", render: (r) => <Badge value="overdue" /> },
                { header: "Amount due", right: true, render: (r) => money(r.amountDue ?? r.total) },
              ]}
              rows={d.overdue.invoices || []}
              empty="Nothing overdue 🎉"
            />
          </Card>
        </>
      )}
    </div>
  );
}
