import { runBillingCycle } from "./billing.js";

const HOUR_IN_MS = 60 * 60 * 1000;

// Runs billing day automatically. It is safe to run on many servers at once
// because every billing period is claimed with an atomic update.
export const startBillingScheduler = () => {
  if (process.env.BILLING_SCHEDULER !== "true") return;

  const intervalMs =
    (Number(process.env.BILLING_INTERVAL_HOURS) || 24) * HOUR_IN_MS;

  const run = async () => {
    try {
      const summary = await runBillingCycle({
        autoConfirm: process.env.BILLING_AUTO_CONFIRM === "true",
      });

      console.log("Billing cycle finished:", summary);
    } catch (error) {
      console.error("Billing cycle failed:", error);
    }
  };

  run();
  setInterval(run, intervalMs).unref();
};
