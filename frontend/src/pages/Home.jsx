import { Link } from "react-router-dom";
import { list } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Badge, Card, Error_, PageHeader, Spinner, Table, date, money, useFetch } from "../ui.jsx";

// Customer portal landing page
export default function Home() {
  const { user } = useAuth();
  const { data, error, loading } = useFetch(async () => {
    const [s, i] = await Promise.all([
      list("/subscriptions", { limit: 5, sort: "-createdAt" }),
      list("/invoices/outstanding", { limit: 5, sort: "dueDate" }),
    ]);
    return { s, i };
  });
  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} />
      <Error_>{error}</Error_>
      {loading && <Spinner />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="My subscriptions" actions={<Link className="text-sm text-indigo-600" to="/subscriptions">All</Link>}>
            <Table
              columns={[
                { header: "Number", render: (r) => <Link className="text-indigo-600" to={`/subscriptions/${r._id}`}>{r.number}</Link> },
                { header: "Plan", render: (r) => r.plan?.name },
                { header: "Status", render: (r) => <Badge value={r.status} /> },
                { header: "Total", right: true, render: (r) => money(r.total) },
              ]}
              rows={data.s.rows}
            />
          </Card>
          <Card title="Invoices to pay" actions={<Link className="text-sm text-indigo-600" to="/invoices">All</Link>}>
            <Table
              columns={[
                { header: "Invoice", render: (r) => <Link className="text-indigo-600" to={`/invoices/${r._id}`}>{r.number}</Link> },
                { header: "Due", render: (r) => date(r.dueDate) },
                { header: "Amount due", right: true, render: (r) => money(r.amountDue) },
              ]}
              rows={data.i.rows}
              empty="You're all paid up."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
