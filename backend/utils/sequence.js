import Counter from "../models/counterModel.js";

// Atomic, gap-free document numbers like SUB-000001 / INV-000001
export const nextSequence = async (name, prefix, padding = 6) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  );

  return `${prefix}-${String(counter.seq).padStart(padding, "0")}`;
};
