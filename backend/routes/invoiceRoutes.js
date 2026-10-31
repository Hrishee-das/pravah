import express from "express";
import * as invoiceController from "../controllers/invoiceController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.use(authController.protect);

// Customers only see their own confirmed and paid invoices
router.use(
  authController.restrictToOwn("customer"),
  invoiceController.hideDraftsFromCustomers,
);

router
  .route("/")
  .get(invoiceController.getAllInvoices)
  .post(
    authController.restrictTo("admin", "staff"),
    invoiceController.createInvoice,
  );

// Billing day: create the invoices for every subscription that is due
router.post(
  "/generate-due",
  authController.restrictTo("admin", "staff"),
  invoiceController.generateDueInvoices,
);

router.get(
  "/outstanding",
  invoiceController.filterOutstanding,
  invoiceController.getAllInvoices,
);
router.get(
  "/overdue",
  invoiceController.filterOverdue,
  invoiceController.getAllInvoices,
);

router.route("/:id").get(invoiceController.getInvoice);
router.get("/:id/print", invoiceController.print);

router.use(authController.restrictTo("admin", "staff"));

router.patch("/:id/confirm", invoiceController.confirm);
router.patch("/:id/cancel", invoiceController.cancel);
router.post("/:id/send", invoiceController.send);

export default router;
