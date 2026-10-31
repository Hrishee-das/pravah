import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A plan must have a name"],
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "A plan must have a price"],
      min: [0, "Price cannot be negative"],
    },
    billingPeriod: {
      type: String,
      required: [true, "A plan must have a billing period"],
      enum: {
        values: ["daily", "weekly", "monthly", "yearly"],
        message: "Billing period is either: daily, weekly, monthly or yearly",
      },
    },
    minQuantity: {
      type: Number,
      default: 1,
      min: [1, "Minimum quantity must be at least 1"],
    },
    startDate: {
      type: Date,
      required: [true, "A plan must have a start date"],
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (el) {
          return !el || !this.startDate || el >= this.startDate;
        },
        message: "Plan end date must be after the start date",
      },
    },
    // The admin decides, plan by plan, what can happen to its subscriptions
    autoClose: {
      type: Boolean,
      default: false,
    },
    allowEarlyClose: {
      type: Boolean,
      default: false,
    },
    allowPause: {
      type: Boolean,
      default: false,
    },
    allowRenew: {
      type: Boolean,
      default: false,
    },
    description: String,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

planSchema.index({ active: 1, startDate: 1, endDate: 1 });

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
