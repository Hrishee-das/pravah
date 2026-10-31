import mongoose from "mongoose";

const taxSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tax must have a name"],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["percentage", "fixed"],
        message: "Tax type is either: percentage or fixed",
      },
      default: "percentage",
    },
    value: {
      type: Number,
      required: [true, "A tax must have a value"],
      min: [0, "Tax value cannot be negative"],
    },
    description: String,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Tax = mongoose.model("Tax", taxSchema);

export default Tax;
