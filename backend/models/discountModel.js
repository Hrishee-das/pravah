import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A discount must have a name"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "A discount must have a type"],
      enum: {
        values: ["fixed", "percentage"],
        message: "Discount type is either: fixed or percentage",
      },
    },
    value: {
      type: Number,
      required: [true, "A discount must have a value"],
      min: [0, "Discount value cannot be negative"],
      validate: {
        validator: function (el) {
          return this.type !== "percentage" || el <= 100;
        },
        message: "A percentage discount cannot be more than 100",
      },
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: 0,
    },
    minQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: [true, "A discount must have a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "A discount must have an end date"],
      validate: {
        validator: function (el) {
          return !this.startDate || el >= this.startDate;
        },
        message: "Discount end date must be after the start date",
      },
    },
    // null means unlimited
    usageLimit: {
      type: Number,
      default: null,
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // A discount applies to specific products or to whole subscriptions
    appliesTo: {
      type: String,
      required: [true, "Please tell us what the discount applies to"],
      enum: {
        values: ["product", "subscription"],
        message: "Discount applies to either: product or subscription",
      },
    },
    products: [{ type: mongoose.Schema.ObjectId, ref: "Product" }],
    subscriptions: [{ type: mongoose.Schema.ObjectId, ref: "Subscription" }],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

discountSchema.pre("validate", async function () {
  if (this.appliesTo === "product" && this.products.length === 0) {
    this.invalidate("products", "Please choose the products this discount applies to");
  }
});

discountSchema.index({ active: 1, startDate: 1, endDate: 1 });
discountSchema.index({ products: 1 });
discountSchema.index({ subscriptions: 1 });

const Discount = mongoose.model("Discount", discountSchema);

export default Discount;
