import Invoice from "../models/invoiceModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";
import {
  generateInvoice,
  confirmInvoice,
  cancelInvoice,
  runBillingCycle,
} from "../utils/billing.js";
import { renderInvoiceHtml } from "../utils/invoiceTemplate.js";
import * as factory from "./handlerFactory.js";

const listPopulate = [
  { path: "customer", select: "name email company" },
  { path: "subscription", select: "number" },
];

// Customers never see drafts or cancelled invoices
export const hideDraftsFromCustomers = (req, res, next) => {
  if (req.user.role === "customer") {
    req.baseFilter = {
      ...req.baseFilter,
      status: { $in: ["confirmed", "paid"] },
    };
  }

  next();
};

// Confirmed invoices that still have money left to pay
export const filterOutstanding = (req, res, next) => {
  req.baseFilter = {
    ...req.baseFilter,
    status: "confirmed",
    amountDue: { $gt: 0 },
  };
  next();
};

// Outstanding invoices that are past their due date
export const filterOverdue = (req, res, next) => {
  req.baseFilter = {
    ...req.baseFilter,
    status: "confirmed",
    amountDue: { $gt: 0 },
    dueDate: { $lt: new Date() },
  };
  next();
};

export const getAllInvoices = factory.getAll(Invoice, listPopulate);
export const getInvoice = factory.getOne(Invoice, listPopulate);

// One invoice from one subscription, with everything already filled in
export const createInvoice = catchAsync(async (req, res, next) => {
  if (!req.body.subscription) {
    return next(new AppError("Please provide the subscription to bill", 400));
  }

  const invoice = await generateInvoice(req.body.subscription, {
    createdBy: req.user._id,
  });

  if (!invoice) {
    return next(
      new AppError(
        "Nothing to bill: the next invoice is not due yet or was already created",
        400,
      ),
    );
  }

  res.status(201).json({
    status: "success",
    data: {
      data: invoice,
    },
  });
});

// Billing day: bills every subscription that is due
export const generateDueInvoices = catchAsync(async (req, res, next) => {
  const options = {
    autoConfirm: [true, "true"].includes(req.body.autoConfirm),
    createdBy: req.user._id,
  };

  // With thousands of subscriptions, let it run and answer straight away
  if ([true, "true"].includes(req.body.background)) {
    runBillingCycle(options)
      .then((summary) => console.log("Billing cycle finished:", summary))
      .catch((error) => console.error("Billing cycle failed:", error));

    return res.status(202).json({
      status: "success",
      message: "Billing run started",
    });
  }

  const summary = await runBillingCycle(options);

  res.status(200).json({
    status: "success",
    data: summary,
  });
});

export const confirm = catchAsync(async (req, res, next) => {
  const invoice = await confirmInvoice(req.params.id);

  if (!invoice) {
    return next(new AppError("Only draft invoices can be confirmed", 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      data: invoice,
    },
  });
});

export const cancel = catchAsync(async (req, res, next) => {
  const invoice = await cancelInvoice(req.params.id);

  if (!invoice) {
    return next(
      new AppError(
        "Only unpaid draft or confirmed invoices can be cancelled",
        400,
      ),
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      data: invoice,
    },
  });
});

export const send = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id).populate(
    "customer",
    "name email",
  );

  if (!invoice) {
    return next(new AppError("No invoice found with that ID", 404));
  }
  if (!["confirmed", "paid"].includes(invoice.status)) {
    return next(new AppError("Confirm the invoice before sending it", 400));
  }
  if (!invoice.customer) {
    return next(new AppError("The customer of this invoice is gone", 400));
  }

  const url = `${req.protocol}://${req.get("host")}/api/v1/invoices/${invoice.id}/print`;
  await new Email(invoice.customer, url).sendInvoice(invoice);

  invoice.sentAt = new Date();
  await Invoice.updateOne({ _id: invoice._id }, { sentAt: invoice.sentAt });

  res.status(200).json({
    status: "success",
    message: "Invoice sent to the customer!",
    data: {
      data: invoice,
    },
  });
});

// Printable page (use the browser's Print / Save as PDF)
export const print = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    ...req.baseFilter,
  });

  if (!invoice) {
    return next(new AppError("No invoice found with that ID", 404));
  }

  res.status(200).type("html").send(renderInvoiceHtml(invoice));
});
