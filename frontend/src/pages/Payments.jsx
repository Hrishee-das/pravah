import { useState } from "react";
import { Link } from "react-router-dom";
import { list } from "../api.js";
import { Error_, PageHeader, Pager, Select, Table, date, label, money, useFetch } from "../ui.jsx";

export const METHODS = ["cash", "card", "bank_transfer", "upi", "cheque", "other"];

export default function Payments() {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState("");
  const limit = 20;
  const { data, error } = useFetch(
    () => list("/payments", { page, limit, sort: "-paymentDate", method }),
    [page, method]
  );
  return (
    <div>
      <PageHeader title="Payments">
        <Select
          placeholder="All methods"
          value={method}
          onChange={(e) => { setPage(1); setMethod(e.target.value); }}
          options={METHODS.map((m) => ({ value: m, label: label(m) }))}
        />
      </PageHeader>
      <Error_>{error}</Error_>
      <div className="rounded-lg border bg-white">
        <Table
          columns={[
            { header: "Date", render: (r) => date(r.paymentDate) },
            { header: "Invoice", render: (r) => r.invoice ? <Link className="text-indigo-600" to={`/invoices/${r.invoice._id}`}>{r.invoice.number}</Link> : "-" },
            { header: "Customer", render: (r) => r.customer?.name },
            { header: "Method", render: (r) => <span className="capitalize">{label(r.method)}</span> },
            { header: "Note", render: (r) => r.note || "-" },
            { header: "Amount", right: true, render: (r) => money(r.amount) },
          ]}
          rows={data?.rows || []}
        />
      </div>
      <Pager page={page} limit={limit} total={data?.total || 0} onPage={setPage} />
    </div>
  );
}
