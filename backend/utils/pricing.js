export const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const PAYMENT_TERM_DAYS = {
  immediate: 0,
  "15_days": 15,
  "30_days": 30,
  "45_days": 45,
  "60_days": 60,
};

// tax = { type: "percentage" | "fixed", value }
export const calculateTaxAmount = (tax, taxableAmount, quantity) => {
  if (tax.type === "fixed") return round2(tax.value * quantity);

  return round2((taxableAmount * tax.value) / 100);
};
