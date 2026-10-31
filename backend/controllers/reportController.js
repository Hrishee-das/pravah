import Subscription from "../models/subscriptionModel.js";
import Plan from "../models/planModel.js";
import Invoice from "../models/invoiceModel.js";
import Payment from "../models/paymentModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { round2 } from "../utils/pricing.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Defaults to the current month so far
const getDateRange = (query) => {
  const now = new Date();

  const from = query.from
    ? new Date(query.from)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = query.to ? new Date(query.to) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError("Please provide valid from and to dates", 400);
  }
  if (from > to) {
    throw new AppError("The from date must be before the to date", 400);
  }

  return { from, to };
};

const totalsOf = (result, key = "total") => ({
  amount: round2(result[0]?.[key] || 0),
  count: result[0]?.count || 0,
});

const MONTHLY_FACTOR = {
  $switch: {
    branches: [
      { case: { $eq: ["$plan.billingPeriod", "daily"] }, then: 365 / 12 },
      { case: { $eq: ["$plan.billingPeriod", "weekly"] }, then: 52 / 12 },
      { case: { $eq: ["$plan.billingPeriod", "monthly"] }, then: 1 },
      { case: { $eq: ["$plan.billingPeriod", "yearly"] }, then: 1 / 12 },
    ],
    default: 0,
  },
};

const AGING_LABELS = {
  0: "1-30 days",
  31: "31-60 days",
  61: "61-90 days",
  "91+": "over 90 days",
};

// One place for active subscriptions, revenue, payments and overdue invoices
export const getDashboard = catchAsync(async (req, res, next) => {
  const { from, to } = getDateRange(req.query);
  const now = new Date();

  const overdueFilter = {
    status: "confirmed",
    amountDue: { $gt: 0 },
    dueDate: { $lt: now },
  };
  const paymentsInRange = { paymentDate: { $gte: from, $lte: to } };

  const [
    subscriptionsByStatus,
    recurring,
    collected,
    collectedByMethod,
    invoiced,
    outstanding,
    overdue,
    overdueAging,
    overdueInvoices,
    recentPayments,
  ] = await Promise.all([
    Subscription.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          paused: { $sum: { $cond: ["$paused", 1, 0] } },
        },
      },
    ]),
    // Monthly recurring revenue: every running subscription as a monthly amount
    Subscription.aggregate([
      { $match: { status: "active", paused: false } },
      {
        $lookup: {
          from: Plan.collection.name,
          localField: "plan",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: "$plan" },
      {
        $group: {
          _id: null,
          mrr: { $sum: { $multiply: ["$subtotal", MONTHLY_FACTOR] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Payment.aggregate([
      { $match: paymentsInRange },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: paymentsInRange },
      {
        $group: {
          _id: "$method",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "paid"] },
          issueDate: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { status: "confirmed", amountDue: { $gt: 0 } } },
      {
        $group: { _id: null, total: { $sum: "$amountDue" }, count: { $sum: 1 } },
      },
    ]),
    Invoice.aggregate([
      { $match: overdueFilter },
      {
        $group: { _id: null, total: { $sum: "$amountDue" }, count: { $sum: 1 } },
      },
    ]),
    Invoice.aggregate([
      { $match: overdueFilter },
      {
        $addFields: {
          daysOverdue: {
            $floor: { $divide: [{ $subtract: [now, "$dueDate"] }, DAY_IN_MS] },
          },
        },
      },
      {
        $bucket: {
          groupBy: "$daysOverdue",
          boundaries: [0, 31, 61, 91],
          default: "91+",
          output: { count: { $sum: 1 }, amount: { $sum: "$amountDue" } },
        },
      },
    ]),
    Invoice.find(overdueFilter)
      .sort("dueDate")
      .limit(20)
      .select("number customer customerDetails dueDate total amountDue")
      .populate("customer", "name email company"),
    Payment.find(paymentsInRange)
      .sort("-paymentDate")
      .limit(10)
      .populate("invoice", "number")
      .populate("customer", "name email"),
  ]);

  const statusCounts = Object.fromEntries(
    subscriptionsByStatus.map((el) => [el._id, el.count]),
  );
  const pausedCount =
    subscriptionsByStatus.find((el) => el._id === "active")?.paused || 0;
  const mrr = round2(recurring[0]?.mrr || 0);

  res.status(200).json({
    status: "success",
    data: {
      period: { from, to },
      subscriptions: {
        active: statusCounts.active || 0,
        paused: pausedCount,
        byStatus: statusCounts,
      },
      recurringRevenue: {
        mrr,
        arr: round2(mrr * 12),
        runningSubscriptions: recurring[0]?.count || 0,
      },
      revenue: {
        collected: totalsOf(collected),
        invoiced: totalsOf(invoiced),
        collectedByMethod: collectedByMethod.map((el) => ({
          method: el._id,
          amount: round2(el.total),
          count: el.count,
        })),
      },
      outstanding: totalsOf(outstanding),
      overdue: {
        ...totalsOf(overdue),
        aging: overdueAging.map((el) => ({
          bucket: AGING_LABELS[el._id],
          amount: round2(el.amount),
          count: el.count,
        })),
        invoices: overdueInvoices,
      },
      recentPayments,
    },
  });
});

// Money collected over time, per day or per month
export const getRevenue = catchAsync(async (req, res, next) => {
  const { from, to } = getDateRange(req.query);

  const interval = req.query.interval || "day";
  if (!["day", "month"].includes(interval)) {
    return next(new AppError("Interval is either: day or month", 400));
  }

  const series = await Payment.aggregate([
    { $match: { paymentDate: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: interval === "month" ? "%Y-%m" : "%Y-%m-%d",
            date: "$paymentDate",
          },
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: "success",
    results: series.length,
    data: {
      period: { from, to },
      interval,
      series: series.map((el) => ({
        date: el._id,
        amount: round2(el.total),
        count: el.count,
      })),
    },
  });
});
