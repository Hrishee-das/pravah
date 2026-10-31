import Payment from "../models/paymentModel.js";
import Invoice from "../models/invoiceModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { round2 } from "../utils/pricing.js";
import * as factory from "./handlerFactory.js";

const listPopulate = [
  { path: "invoice", select: "number total status" },
  { path: "customer", select: "name email company" },
];

// Adds the payment to the invoice in one atomic step, so two payments at the
// same time can never pay more than what is due. The invoice becomes Paid
// as soon as nothing is left to pay.
const addPaymentPipeline = (amount, paymentDate) => [
  {
    $set: {
      amountPaid: { $round: [{ $add: ["$amountPaid", amount] }, 2] },
    },
  },
  {
    $set: {
      amountDue: { $round: [{ $subtract: ["$total", "$amountPaid"] }, 2] },
    },
  },
  {
    $set: {
      status: { $cond: [{ $lte: ["$amountDue", 0] }, "paid", "$status"] },
      paidAt: { $cond: [{ $lte: ["$amountDue", 0] }, paymentDate, "$paidAt"] },
    },
  },
];

const removePaymentPipeline = (amount) => [
  {
    $set: {
      amountPaid: { $round: [{ $subtract: ["$amountPaid", amount] }, 2] },
    },
  },
  {
    $set: {
      amountDue: { $round: [{ $subtract: ["$total", "$amountPaid"] }, 2] },
    },
  },
  {
    $set: {
      status: { $cond: [{ $eq: ["$status", "paid"] }, "confirmed", "$status"] },
      paidAt: { $cond: [{ $eq: ["$status", "paid"] }, null, "$paidAt"] },
    },
  },
];

export const getAllPayments = factory.getAll(Payment, listPopulate);
export const getPayment = factory.getOne(Payment, listPopulate);

// Records a payment (method, amount, date and note) against an invoice
export const createPayment = catchAsync(async (req, res, next) => {
  const { invoice: invoiceId, method, note } = req.body;

  const amount = round2(req.body.amount);
  if (!(amount > 0)) {
    return next(new AppError("Payment amount must be greater than 0", 400));
  }

  const paymentDate = req.body.paymentDate
    ? new Date(req.body.paymentDate)
    : new Date();
  if (Number.isNaN(paymentDate.getTime())) {
    return next(new AppError("Please provide a valid payment date", 400));
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return next(new AppError("No invoice found with that ID", 404));
  }
  if (invoice.status === "draft") {
    return next(
      new AppError("Confirm the invoice before recording payments", 400),
    );
  }
  if (invoice.status === "cancelled") {
    return next(new AppError("This invoice is cancelled", 400));
  }
  if (invoice.status === "paid") {
    return next(new AppError("This invoice is already fully paid", 400));
  }

  const updatedInvoice = await Invoice.findOneAndUpdate(
    {
      _id: invoice._id,
      status: "confirmed",
      $expr: { $lte: [amount, "$amountDue"] },
    },
    addPaymentPipeline(amount, paymentDate),
    { returnDocument: "after", updatePipeline: true },
  );

  if (!updatedInvoice) {
    return next(
      new AppError(
        `Payment is more than the amount due (${invoice.amountDue})`,
        400,
      ),
    );
  }

  try {
    const payment = await Payment.create({
      invoice: invoice._id,
      customer: invoice.customer,
      method,
      amount,
      paymentDate,
      note,
      recordedBy: req.user._id,
    });

    res.status(201).json({
      status: "success",
      data: {
        data: payment,
        invoice: updatedInvoice,
      },
    });
  } catch (err) {
    // The payment was not saved, so take it back off the invoice
    await Invoice.updateOne({ _id: invoice._id }, removePaymentPipeline(amount), {
      updatePipeline: true,
    });

    throw err;
  }
});
