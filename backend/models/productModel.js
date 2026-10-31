import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  attribute: {
    type: String,
    required: [true, "A variant must have an attribute (e.g. Brand)"],
    trim: true,
  },
  value: {
    type: String,
    required: [true, "A variant must have a value (e.g. Odoo)"],
    trim: true,
  },
  extraPrice: {
    type: Number,
    default: 0,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A product must have a name"],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["software", "add-on", "service", "other"],
        message: "Product type is either: software, add-on, service or other",
      },
      default: "software",
    },
    salesPrice: {
      type: Number,
      required: [true, "A product must have a sales price"],
      min: [0, "Sales price cannot be negative"],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, "Cost price cannot be negative"],
    },
    notes: String,
    variants: [variantSchema],
    taxes: [{ type: mongoose.Schema.ObjectId, ref: "Tax" }],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

productSchema.index({ name: 1 });
productSchema.index({ active: 1, type: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
