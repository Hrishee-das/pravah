import express from "express";
import * as subscriptionController from "../controllers/subscriptionController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.use(authController.protect);

// Customers only see their own subscriptions (and never the drafts)
router.use(
  authController.restrictToOwn("customer"),
  subscriptionController.hideDraftsFromCustomers,
);

router
  .route("/")
  .get(subscriptionController.getAllSubscriptions)
  .post(
    authController.restrictTo("admin", "staff"),
    subscriptionController.createSubscription,
  );

router
  .route("/:id")
  .get(subscriptionController.getSubscription)
  .patch(
    authController.restrictTo("admin", "staff"),
    subscriptionController.updateSubscription,
  )
  .delete(
    authController.restrictTo("admin"),
    subscriptionController.deleteSubscription,
  );

// Draft -> Quotation -> Confirmed -> Active -> Closed
router.patch(
  "/:id/send-quotation",
  authController.restrictTo("admin", "staff"),
  subscriptionController.sendQuotation,
);
router.patch("/:id/confirm", subscriptionController.confirmSubscription);
router.patch(
  "/:id/activate",
  authController.restrictTo("admin", "staff"),
  subscriptionController.activateSubscription,
);

// Customers can manage their own subscriptions, if the plan allows it
router.patch("/:id/pause", subscriptionController.pauseSubscription);
router.patch("/:id/resume", subscriptionController.resumeSubscription);
router.patch("/:id/close", subscriptionController.closeSubscription);
router.patch("/:id/renew", subscriptionController.renewSubscription);

export default router;
