import Subscription from "../models/subscriptionModel.js";
import Invoice from "../models/invoiceModel.js";
import Discount from "../models/discountModel.js";
import Plan from "../models/planModel.js";
import Tax from "../models/taxModel.js";
import AppError from "./appError.js";
import { addBillingPeriod, addDays } from "./dates.js";
import { round2, calculateTaxAmount, PAYMENT_TERM_DAYS } from "./pricing.js";

// Safety net so a subscription that was never billed cannot loop forever
const MAX_CATCH_UP_PERIODS = 60;

const hasRoomLeft = [
  { usageLimit: null },
  { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
];

const sumOf = (items, key) =>
  round2(items.reduce((total, item) => total + item[key], 0));

// 1) Discounts ------------------------------------------------------------

// Discounts that are running today and point at this subscription or its products
const findCandidateDiscounts = (subscription, lines, now) => {
  const productIds = lines.filter((line) => line.product).map((l) => l.product);

  return Discount.find({
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $and: [
      { $or: hasRoomLeft },
      {
        $or: [
          { appliesTo: "product", products: { $in: productIds } },
          { appliesTo: "subscription", subscriptions: subscription._id },
        ],
      },
    ],
  }).sort("createdAt");
};

// Works out what a discount would take off, without changing anything yet
const evaluateDiscount = (discount, lines) => {
  const eligible =
    discount.appliesTo === "product"
      ? lines.filter(
          (line) =>
            line.product && discount.products.some((p) => p.equals(line.product)),
        )
      : lines;

  if (eligible.length === 0) return null;

  const purchase = sumOf(eligible, "amount");
  const quantity = sumOf(eligible, "quantity");

  if (purchase < discount.minPurchase || quantity < discount.minQuantity) {
    return null;
  }

  const remaining = round2(
    eligible.reduce((total, l) => total + l.amount - l.discountAmount, 0),
  );
  if (remaining <= 0) return null;

  const amount =
    discount.type === "percentage"
      ? round2((remaining * discount.value) / 100)
      : discount.value;

  return { eligible, remaining, amount: Math.min(round2(amount), remaining) };
};

// Spreads the discount over the eligible lines so each line is taxed correctly
const allocateDiscount = ({ eligible, remaining, amount }) => {
  let allocated = 0;

  eligible.forEach((line, index) => {
    const lineRemaining = round2(line.amount - line.discountAmount);
    const share =
      index === eligible.length - 1
        ? round2(amount - allocated)
        : round2((amount * lineRemaining) / remaining);
    const applied = Math.min(share, lineRemaining);

    line.discountAmount = round2(line.discountAmount + applied);
    allocated = round2(allocated + applied);
  });

  return allocated;
};

// Uses up one use of the discount, but only if it still has room left
const claimDiscountUse = (discountId) =>
  Discount.findOneAndUpdate(
    { _id: discountId, $or: hasRoomLeft },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" },
  );

const releaseDiscountUses = async (discountIds) => {
  if (discountIds.length === 0) return;

  await Discount.updateMany(
    { _id: { $in: discountIds }, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
  );
};

// 2) Invoice lines and taxes ---------------------------------------------

const buildLines = (subscription) => {
  const lines = subscription.lines.map((line) => ({
    product: line.product,
    description: line.variantLabel
      ? `${line.productName} (${line.variantLabel})`
      : line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: round2(line.quantity * line.unitPrice),
    discountAmount: 0,
    taxIds: line.taxes,
  }));

  if (subscription.planPrice > 0) {
    lines.unshift({
      description: `${subscription.plan.name} plan fee`,
      quantity: 1,
      unitPrice: subscription.planPrice,
      amount: subscription.planPrice,
      discountAmount: 0,
      taxIds: [],
    });
  }

  return lines;
};

// Taxes always follow the rules the admin has set right now
const applyTaxes = async (lines) => {
  const taxIds = lines.flatMap((line) => line.taxIds);
  const taxes = await Tax.find({ _id: { $in: taxIds }, active: true });
  const taxById = new Map(taxes.map((tax) => [tax.id, tax]));

  return lines.map(({ taxIds: lineTaxIds, ...line }) => {
    const taxableAmount = round2(line.amount - line.discountAmount);

    const lineTaxes = lineTaxIds
      .map((id) => taxById.get(String(id)))
      .filter(Boolean)
      .map((tax) => ({
        tax: tax._id,
        name: tax.name,
        type: tax.type,
        value: tax.value,
        amount: calculateTaxAmount(tax, taxableAmount, line.quantity),
      }));

    const taxAmount = sumOf(lineTaxes, "amount");

    return {
      ...line,
      taxes: lineTaxes,
      taxAmount,
      total: round2(taxableAmount + taxAmount),
    };
  });
};

// 3) Invoice generation --------------------------------------------------

// Creates the invoice for the next billing period of a subscription.
// Returns null when nothing is due (not due yet, fully billed, or another
// request billed it first), so a period is never billed twice.
export const generateInvoice = async (subscriptionId, options = {}) => {
  const { dueOnly = true, createdBy } = options;

  const subscription = await Subscription.findById(subscriptionId)
    .populate("plan")
    .populate("customer", "name email phone company address");

  if (!subscription) {
    throw new AppError("No subscription found with that ID", 404);
  }
  if (subscription.status !== "active" || subscription.paused) {
    throw new AppError("Only active, running subscriptions can be billed", 400);
  }
  if (!subscription.plan || !subscription.customer) {
    throw new AppError("The plan or customer of this subscription is gone", 400);
  }

  const now = new Date();
  const periodStart = subscription.nextInvoiceDate;
  const periodIndex = subscription.periodsBilled;

  if (periodStart >= subscription.expiryDate) return null;
  if (dueOnly && periodStart > now) return null;

  const { billingPeriod } = subscription.plan;
  let periodEnd = addBillingPeriod(
    subscription.billingAnchor,
    billingPeriod,
    periodIndex + 1,
  );
  // Plan period was changed after the anchor was set
  if (periodEnd <= periodStart) {
    periodEnd = addBillingPeriod(periodStart, billingPeriod, 1);
  }

  // Claim the period first. Only one request can win this update.
  const claimed = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      status: "active",
      paused: false,
      nextInvoiceDate: periodStart,
      periodsBilled: periodIndex,
    },
    {
      $inc: { periodsBilled: 1 },
      $set: { nextInvoiceDate: periodEnd, lastInvoicedAt: now },
    },
  );
  if (!claimed) return null;

  const claimedDiscountIds = [];

  try {
    const lines = buildLines(subscription);

    // Discounts show up on the invoice on their own
    const appliedDiscounts = [];
    const candidates = await findCandidateDiscounts(subscription, lines, now);

    for (const discount of candidates) {
      const evaluation = evaluateDiscount(discount, lines);
      if (!evaluation || evaluation.amount <= 0) continue;

      if (!(await claimDiscountUse(discount._id))) continue;
      claimedDiscountIds.push(discount._id);

      appliedDiscounts.push({
        discount: discount._id,
        name: discount.name,
        type: discount.type,
        value: discount.value,
        amount: allocateDiscount(evaluation),
      });
    }

    const invoiceLines = await applyTaxes(lines);

    const subtotal = sumOf(invoiceLines, "amount");
    const discountTotal = sumOf(invoiceLines, "discountAmount");
    const taxTotal = sumOf(invoiceLines, "taxAmount");
    const total = round2(subtotal - discountTotal + taxTotal);

    const invoice = await Invoice.create({
      subscription: subscription._id,
      customer: subscription.customer._id,
      customerDetails: {
        name: subscription.customer.name,
        email: subscription.customer.email,
        phone: subscription.customer.phone,
        company: subscription.customer.company,
        address: subscription.customer.address,
      },
      periodStart,
      periodEnd,
      periodIndex,
      periodKey: `${subscription._id}:${periodStart.toISOString()}`,
      issueDate: now,
      dueDate: addDays(now, PAYMENT_TERM_DAYS[subscription.paymentTerms]),
      paymentTerms: subscription.paymentTerms,
      lines: invoiceLines,
      discounts: appliedDiscounts,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      amountDue: total,
      createdBy,
    });

    return invoice;
  } catch (err) {
    // Give the period and the discount uses back so it can be billed again
    await Subscription.updateOne(
      { _id: subscription._id, nextInvoiceDate: periodEnd },
      {
        $inc: { periodsBilled: -1 },
        $set: {
          nextInvoiceDate: periodStart,
          lastInvoicedAt: subscription.lastInvoicedAt,
        },
      },
    );
    await releaseDiscountUses(claimedDiscountIds);

    throw err;
  }
};

// 4) Invoice status changes ----------------------------------------------

// Draft -> Confirmed (an invoice with nothing to pay is Paid straight away)
export const confirmInvoice = (invoiceId) =>
  Invoice.findOneAndUpdate(
    { _id: invoiceId, status: "draft" },
    [
      {
        $set: {
          status: { $cond: [{ $lte: ["$total", 0] }, "paid", "confirmed"] },
          confirmedAt: new Date(),
        },
      },
    ],
    { returnDocument: "after", updatePipeline: true },
  );

// Draft/Confirmed -> Cancelled, only while nothing has been paid
export const cancelInvoice = async (invoiceId) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: invoiceId, status: { $in: ["draft", "confirmed"] }, amountPaid: 0 },
    {
      $set: { status: "cancelled", cancelledAt: new Date() },
      $unset: { periodKey: 1 },
    },
    { returnDocument: "after" },
  );
  if (!invoice) return null;

  // Make the period billable again, but only if no later period was billed
  await Subscription.updateOne(
    { _id: invoice.subscription, nextInvoiceDate: invoice.periodEnd },
    {
      $set: { nextInvoiceDate: invoice.periodStart },
      $inc: { periodsBilled: -1 },
    },
  );
  await releaseDiscountUses(invoice.discounts.map((el) => el.discount));

  return invoice;
};

// 5) Billing day ----------------------------------------------------------

// Confirmed subscriptions whose start date has arrived become Active
const activateDueSubscriptions = async (now) => {
  const result = await Subscription.updateMany(
    { status: "confirmed", startDate: { $lte: now } },
    [
      {
        $set: {
          status: "active",
          activatedAt: now,
          billingAnchor: "$startDate",
          nextInvoiceDate: "$startDate",
          periodsBilled: 0,
          statusHistory: {
            $concatArrays: [
              { $ifNull: ["$statusHistory", []] },
              [{ status: "active", changedAt: now }],
            ],
          },
        },
      },
    ],
    { updatePipeline: true },
  );

  return result.modifiedCount;
};

// Plans that close on their own do so when they (or the subscription) end
const closeExpiredSubscriptions = async (now) => {
  const autoClosePlans = await Plan.find({ autoClose: true }).select(
    "_id endDate",
  );
  if (autoClosePlans.length === 0) return 0;

  const endedPlanIds = autoClosePlans
    .filter((plan) => plan.endDate && plan.endDate < now)
    .map((plan) => plan._id);

  const result = await Subscription.updateMany(
    {
      status: "active",
      plan: { $in: autoClosePlans.map((plan) => plan._id) },
      $or: [{ expiryDate: { $lt: now } }, { plan: { $in: endedPlanIds } }],
    },
    [
      {
        $set: {
          status: "closed",
          closedAt: now,
          statusHistory: {
            $concatArrays: [
              { $ifNull: ["$statusHistory", []] },
              [{ status: "closed", changedAt: now }],
            ],
          },
        },
      },
    ],
    { updatePipeline: true },
  );

  return result.modifiedCount;
};

// Bills every subscription that is due, catching up on any missed periods
export const runBillingCycle = async (options = {}) => {
  const { autoConfirm = false, createdBy } = options;
  const now = new Date();

  const summary = {
    activated: await activateDueSubscriptions(now),
    invoicesCreated: 0,
    invoicesConfirmed: 0,
    closed: 0,
    errors: [],
  };

  const due = Subscription.find({
    status: "active",
    paused: false,
    nextInvoiceDate: { $lte: now },
    $expr: { $lt: ["$nextInvoiceDate", "$expiryDate"] },
  })
    .select("_id number")
    .cursor();

  for await (const { _id, number } of due) {
    try {
      for (let i = 0; i < MAX_CATCH_UP_PERIODS; i++) {
        const invoice = await generateInvoice(_id, { createdBy });
        if (!invoice) break;

        summary.invoicesCreated += 1;

        if (autoConfirm && (await confirmInvoice(invoice._id))) {
          summary.invoicesConfirmed += 1;
        }
      }
    } catch (err) {
      summary.errors.push({ subscription: number, message: err.message });
    }
  }

  summary.closed = await closeExpiredSubscriptions(now);

  return summary;
};
