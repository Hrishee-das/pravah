const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const money = (value) => Number(value || 0).toFixed(2);
const day = (date) => (date ? new Date(date).toDateString() : "-");

// Printable HTML version of an invoice (use the browser's Print / Save as PDF)
export const renderInvoiceHtml = (invoice) => {
  const customer = invoice.customerDetails || {};

  const rows = invoice.lines
    .map(
      (line) => `<tr>
        <td>${escapeHtml(line.description)}</td>
        <td class="num">${escapeHtml(line.quantity)}</td>
        <td class="num">${money(line.unitPrice)}</td>
        <td class="num">${money(line.discountAmount)}</td>
        <td>${escapeHtml(line.taxes.map((t) => t.name).join(", ") || "-")}</td>
        <td class="num">${money(line.total)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.number)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
    h1 { margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
    .num { text-align: right; }
    .totals { margin-top: 16px; margin-left: auto; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-weight: bold; border-top: 2px solid #222; }
  </style>
</head>
<body>
  <h1>Invoice ${escapeHtml(invoice.number)}</h1>
  <p>Status: ${escapeHtml(invoice.status.toUpperCase())}</p>
  <p>
    <strong>${escapeHtml(customer.name)}</strong><br />
    ${escapeHtml(customer.company)}<br />
    ${escapeHtml(customer.address)}<br />
    ${escapeHtml(customer.email)}
  </p>
  <p>
    Issued: ${day(invoice.issueDate)}<br />
    Due: ${day(invoice.dueDate)}<br />
    Billing period: ${day(invoice.periodStart)} - ${day(invoice.periodEnd)}
  </p>
  <table>
    <thead>
      <tr>
        <th>Description</th><th class="num">Qty</th><th class="num">Unit price</th>
        <th class="num">Discount</th><th>Taxes</th><th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${money(invoice.subtotal)}</span></div>
    <div><span>Discounts</span><span>-${money(invoice.discountTotal)}</span></div>
    <div><span>Taxes</span><span>${money(invoice.taxTotal)}</span></div>
    <div class="grand"><span>Total</span><span>${money(invoice.total)}</span></div>
    <div><span>Paid</span><span>${money(invoice.amountPaid)}</span></div>
    <div class="grand"><span>Amount due</span><span>${money(invoice.amountDue)}</span></div>
  </div>
</body>
</html>`;
};
