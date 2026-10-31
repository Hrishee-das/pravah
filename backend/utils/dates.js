const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const addDays = (date, days) =>
  new Date(new Date(date).getTime() + days * DAY_IN_MS);

// Adds months without overflowing (e.g. 31 Jan + 1 month = 28/29 Feb)
const addMonths = (date, months) => {
  const result = new Date(date);
  const day = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDayOfMonth));

  return result;
};

export const addBillingPeriod = (date, billingPeriod, count = 1) => {
  switch (billingPeriod) {
    case "daily":
      return addDays(date, count);
    case "weekly":
      return addDays(date, 7 * count);
    case "monthly":
      return addMonths(date, count);
    case "yearly":
      return addMonths(date, 12 * count);
    default:
      throw new Error(`Unknown billing period: ${billingPeriod}`);
  }
};
