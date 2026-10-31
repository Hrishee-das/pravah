import mongoose from "mongoose";

const templateLineSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: [true, "A template line must have a product"],
  },
  // _id of one of the product's variants
  variant: mongoose.Schema.ObjectId,
  quantity: {
    type: Number,
    default: 1,
    min: [1, "Quantity must be at least 1"],
  },
});

const quotationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A quotation template must have a name"],
      unique: true,
      trim: true,
    },
    plan: {
      type: mongoose.Schema.ObjectId,
      ref: "Plan",
      required: [true, "A quotation template must have a plan"],
    },
    // How many days a quotation made from this template stays valid
    validityDays: {
      type: Number,
      default: 30,
      min: [1, "Validity must be at least 1 day"],
    },
    lines: {
      type: [templateLineSchema],
      validate: {
        validator: (el) => el.length > 0,
        message: "A quotation template must have at least one line",
      },
    },
    notes: String,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const QuotationTemplate = mongoose.model(
  "QuotationTemplate",
  quotationTemplateSchema,
);

export default QuotationTemplate;
