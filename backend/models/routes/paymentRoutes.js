import express from "express";
import * as paymentController from "../controllers/paymentController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.use(authController.protect);

// Customers only see their own payments
router.use(authController.restrictToOwn("customer"));

router
  .route("/")
  .get(paymentController.getAllPayments)
  .post(
    authController.restrictTo("admin", "staff"),
    paymentController.createPayment,
  );

router.route("/:id").get(paymentController.getPayment);

export default router;
