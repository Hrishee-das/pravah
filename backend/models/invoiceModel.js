import mongoose from "mongoose";
import { nextSequence } from "../utils/sequence.js";

const invoiceTaxSchema = new mongoose.Schema(
  {
    tax: { type: mongoose.Schema.ObjectId, ref: "Tax" },
    name: String,
    type: String,
    value: Number,
    amount: Number,
  },
  { _id: false },
);

const invoiceLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.ObjectId, ref: "Product" },
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  taxes: [invoiceTaxSchema],
  taxAmount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const invoiceDiscountSchema = new mongoose.Schema(
  {
    discount: { type: mongoose.Schema.ObjectId, ref: "Discount" },
    name: String,
    type: String,
    value: Number,
    amount: Number,
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      unique: true,
    },
    subscription: {
      type: mongoose.Schema.ObjectId,
      ref: "Subscription",
      required: [true, "An invoice must belong to a subscription"],
    },
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "An invoice must belong to a customer"],
    },
    // Customer details are copied so old invoices never change
    customerDetails: {
      name: String,
      email: String,
      phone: String,
      company: String,
      address: String,
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "paid", "cancelled"],
      default: "draft",
    },

    // The billing period this invoice covers
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    periodIndex: Number,
    // Unique per subscription + period, so nothing is ever billed twice.
    // Removed when an invoice is cancelled so the period can be billed again.
    periodKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentTerms: String,

    lines: [invoiceLineSchema],
    discounts: [invoiceDiscountSchema],

    subtotal: {
      type: Number,
      default: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
    },

    confirmedAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    sentAt: Date,
    notes: String,
    createdBy: { type: mongoose.Schema.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

invoiceSchema.index({ customer: 1, status: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ subscription: 1, periodStart: 1 });
invoiceSchema.index({ issueDate: -1 });

invoiceSchema.virtual("isOverdue").get(function () {
  return this.status === "confirmed" && this.dueDate < new Date();
});

invoiceSchema.pre("validate", async function () {
  if (this.isNew && !this.number) {
    this.number = await nextSequence("invoice", "INV");
  }
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
