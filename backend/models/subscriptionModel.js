import mongoose from "mongoose";
import { nextSequence } from "../utils/sequence.js";

const lineSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: [true, "A subscription line must have a product"],
  },
  productName: String,
  variant: mongoose.Schema.ObjectId,
  variantLabel: String,
  quantity: {
    type: Number,
    required: [true, "A subscription line must have a quantity"],
    min: [1, "Quantity must be at least 1"],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  taxes: [{ type: mongoose.Schema.ObjectId, ref: "Tax" }],
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const statusHistorySchema = new mongoose.Schema(
  {
    status: String,
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
  },
  { _id: false },
);

const subscriptionSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A subscription must belong to a customer"],
    },
    plan: {
      type: mongoose.Schema.ObjectId,
      ref: "Plan",
      required: [true, "A subscription must have a plan"],
    },
    template: {
      type: mongoose.Schema.ObjectId,
      ref: "QuotationTemplate",
    },
    status: {
      type: String,
      enum: ["draft", "quotation", "confirmed", "active", "closed"],
      default: "draft",
    },
    paused: {
      type: Boolean,
      default: false,
    },
    pausedAt: Date,
    startDate: {
      type: Date,
      required: [true, "A subscription must have a start date"],
    },
    expiryDate: {
      type: Date,
      required: [true, "A subscription must have an expiry date"],
      validate: {
        validator: function (el) {
          return !this.startDate || el > this.startDate;
        },
        message: "Expiry date must be after the start date",
      },
    },
    paymentTerms: {
      type: String,
      enum: ["immediate", "15_days", "30_days", "45_days", "60_days"],
      default: "immediate",
    },
    lines: {
      type: [lineSchema],
      validate: {
        validator: (el) => el.length > 0,
        message: "A subscription must have at least one line",
      },
    },

    // Recurring amounts (before discounts, which are applied on each invoice)
    planPrice: {
      type: Number,
      default: 0,
    },
    subtotal: {
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

    // How many days the quotation stays valid once it is sent
    validityDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    quotationValidUntil: Date,
    activatedAt: Date,
    closedAt: Date,

    // Billing cursor: invoice n covers [anchor + n periods, anchor + n+1 periods)
    billingAnchor: Date,
    periodsBilled: {
      type: Number,
      default: 0,
    },
    nextInvoiceDate: Date,
    lastInvoicedAt: Date,

    statusHistory: [statusHistorySchema],
    notes: String,
  },
  { timestamps: true },
);

subscriptionSchema.index({ customer: 1, status: 1 });
subscriptionSchema.index({ status: 1, nextInvoiceDate: 1 });
subscriptionSchema.index({ status: 1, expiryDate: 1 });
subscriptionSchema.index({ plan: 1 });

subscriptionSchema.pre("validate", async function () {
  if (this.isNew && !this.number) {
    this.number = await nextSequence("subscription", "SUB");
  }
});

subscriptionSchema.methods.setStatus = function (status, userId) {
  const now = new Date();

  this.status = status;
  this.statusHistory.push({ status, changedAt: now, changedBy: userId });

  if (status === "active") this.activatedAt = now;
  if (status === "closed") this.closedAt = now;
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
