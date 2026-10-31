import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.ObjectId,
      ref: "Invoice",
      required: [true, "A payment must belong to an invoice"],
    },
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A payment must belong to a customer"],
    },
    method: {
      type: String,
      required: [true, "Please provide the payment method"],
      enum: {
        values: ["cash", "card", "bank_transfer", "upi", "cheque", "other"],
        message:
          "Payment method is either: cash, card, bank_transfer, upi, cheque or other",
      },
    },
    amount: {
      type: Number,
      required: [true, "Please provide the payment amount"],
      min: [0.01, "Payment amount must be greater than 0"],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    note: String,
    recordedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

paymentSchema.index({ invoice: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ paymentDate: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
