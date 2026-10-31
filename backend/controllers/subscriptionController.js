import Subscription from "../models/subscriptionModel.js";
import Plan from "../models/planModel.js";
import Product from "../models/productModel.js";
import Tax from "../models/taxModel.js";
import User from "../models/userModel.js";
import QuotationTemplate from "../models/quotationTemplateModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { addBillingPeriod, addDays } from "../utils/dates.js";
import { round2, calculateTaxAmount } from "../utils/pricing.js";
import * as factory from "./handlerFactory.js";

const listPopulate = [
  { path: "customer", select: "name email company" },
  { path: "plan", select: "name price billingPeriod" },
];

const detailPopulate = [
  { path: "customer", select: "name email phone company address" },
  { path: "plan" },
  { path: "lines.product", select: "name type" },
  { path: "lines.taxes", select: "name type value" },
];

// Customers never see drafts, only the offers sent to them
export const hideDraftsFromCustomers = (req, res, next) => {
  if (req.user.role === "customer") {
    req.baseFilter = { ...req.baseFilter, status: { $ne: "draft" } };
  }

  next();
};

const parseDate = (value, label) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new AppError(`Please provide a valid ${label}`, 400);
  }

  return date;
};

const checkPlanAvailable = (plan, startDate) => {
  if (startDate < plan.startDate || (plan.endDate && startDate > plan.endDate)) {
    throw new AppError("This plan is not available on that start date", 400);
  }
};

// Prices the lines from the products, so customers can never set a price
const priceLines = async (rawLines, plan) => {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new AppError("A subscription needs at least one line", 400);
  }

  const products = await Product.find({
    _id: { $in: rawLines.map((line) => line.product) },
    active: true,
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const lines = rawLines.map((rawLine) => {
    const product = productById.get(String(rawLine.product));
    if (!product) {
      throw new AppError(
        `Product ${rawLine.product} was not found or is not active`,
        400,
      );
    }

    const quantity = Number(rawLine.quantity ?? plan.minQuantity);
    if (!Number.isInteger(quantity) || quantity < plan.minQuantity) {
      throw new AppError(
        `Quantity for ${product.name} must be a whole number of at least ${plan.minQuantity}`,
        400,
      );
    }

    // Choosing a variant (e.g. the Odoo brand) adds its extra price
    let variant;
    if (rawLine.variant) {
      variant = product.variants.id(rawLine.variant);
      if (!variant) {
        throw new AppError(`Variant not found on ${product.name}`, 400);
      }
    }

    const unitPrice = round2(product.salesPrice + (variant?.extraPrice || 0));

    return {
      product: product._id,
      productName: product.name,
      variant: variant?._id,
      variantLabel: variant ? `${variant.attribute}: ${variant.value}` : undefined,
      quantity,
      unitPrice,
      taxes: product.taxes,
      amount: round2(unitPrice * quantity),
    };
  });

  const taxes = await Tax.find({
    _id: { $in: lines.flatMap((line) => line.taxes) },
    active: true,
  });
  const taxById = new Map(taxes.map((tax) => [tax.id, tax]));

  const taxTotal = round2(
    lines.reduce(
      (total, line) =>
        total +
        line.taxes.reduce((sum, id) => {
          const tax = taxById.get(String(id));
          return tax ? sum + calculateTaxAmount(tax, line.amount, line.quantity) : sum;
        }, 0),
      0,
    ),
  );
  const subtotal = round2(
    plan.price + lines.reduce((total, line) => total + line.amount, 0),
  );

  return { lines, subtotal, taxTotal, total: round2(subtotal + taxTotal) };
};

const findCustomer = async (customerId) => {
  const customer = await User.findOne({ _id: customerId, role: "customer" });

  if (!customer) throw new AppError("No customer found with that ID", 404);

  return customer;
};

const findPlan = async (planId) => {
  const plan = await Plan.findOne({ _id: planId, active: true });

  if (!plan) throw new AppError("No active plan found with that ID", 404);

  return plan;
};

const sendSubscription = (res, subscription, statusCode = 200) =>
  res.status(statusCode).json({
    status: "success",
    data: {
      data: subscription,
    },
  });

export const getAllSubscriptions = factory.getAll(Subscription, listPopulate);
export const getSubscription = factory.getOne(Subscription, detailPopulate);

// A rep can start from a quotation template instead of building from scratch
export const createSubscription = catchAsync(async (req, res, next) => {
  let template;
  if (req.body.template) {
    template = await QuotationTemplate.findOne({
      _id: req.body.template,
      active: true,
    });
    if (!template) {
      return next(new AppError("No active quotation template found", 404));
    }
  }

  const customer = await findCustomer(req.body.customer);
  const plan = await findPlan(req.body.plan || template?.plan);

  const startDate = parseDate(req.body.startDate, "start date");
  checkPlanAvailable(plan, startDate);

  const expiryDate = req.body.expiryDate
    ? parseDate(req.body.expiryDate, "expiry date")
    : plan.endDate || addBillingPeriod(startDate, plan.billingPeriod, 1);

  const rawLines = req.body.lines?.length
    ? req.body.lines
    : template?.lines.map((line) => ({
        product: line.product,
        variant: line.variant,
        quantity: line.quantity,
      }));
  const { lines, subtotal, taxTotal, total } = await priceLines(rawLines, plan);

  const subscription = new Subscription({
    customer: customer._id,
    plan: plan._id,
    template: template?._id,
    startDate,
    expiryDate,
    paymentTerms: req.body.paymentTerms,
    validityDays: template?.validityDays || req.body.validityDays,
    notes: req.body.notes,
    lines,
    planPrice: plan.price,
    subtotal,
    taxTotal,
    total,
  });
  subscription.setStatus("draft", req.user._id);
  await subscription.save();

  sendSubscription(res, subscription, 201);
});

// Lines, plan and dates can only change while it is still an offer
export const updateSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findById(req.params.id);

  if (!subscription) {
    return next(new AppError("No subscription found with that ID", 404));
  }
  if (!["draft", "quotation"].includes(subscription.status)) {
    return next(
      new AppError("Only draft or quotation subscriptions can be edited", 400),
    );
  }

  if (req.body.customer) {
    subscription.customer = (await findCustomer(req.body.customer))._id;
  }

  const plan = await findPlan(req.body.plan || subscription.plan);
  const startDate = req.body.startDate
    ? parseDate(req.body.startDate, "start date")
    : subscription.startDate;
  checkPlanAvailable(plan, startDate);

  subscription.plan = plan._id;
  subscription.startDate = startDate;
  if (req.body.expiryDate) {
    subscription.expiryDate = parseDate(req.body.expiryDate, "expiry date");
  }
  if (req.body.paymentTerms) subscription.paymentTerms = req.body.paymentTerms;
  if (req.body.validityDays) subscription.validityDays = req.body.validityDays;
  if (req.body.notes !== undefined) subscription.notes = req.body.notes;

  // Prices always follow the current plan and products
  const rawLines =
    req.body.lines ||
    subscription.lines.map((line) => ({
      product: line.product,
      variant: line.variant,
      quantity: line.quantity,
    }));
  const { lines, subtotal, taxTotal, total } = await priceLines(rawLines, plan);

  subscription.lines = lines;
  subscription.planPrice = plan.price;
  subscription.subtotal = subtotal;
  subscription.taxTotal = taxTotal;
  subscription.total = total;
  await subscription.save();

  sendSubscription(res, subscription);
});

// Only drafts can be deleted, anything else is closed instead
export const deleteSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOneAndDelete({
    _id: req.params.id,
    status: "draft",
  });

  if (!subscription) {
    return next(
      new AppError("No draft subscription found with that ID", 404),
    );
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Status changes ----------------------------------------------------------

const getSubscriptionForAction = async (req) => {
  const subscription = await Subscription.findOne({
    _id: req.params.id,
    ...req.baseFilter,
  }).populate("plan");

  if (!subscription) {
    throw new AppError("No subscription found with that ID", 404);
  }

  return subscription;
};

const requireStatus = (subscription, status, action) => {
  if (subscription.status !== status) {
    throw new AppError(
      `Only ${status} subscriptions can be ${action} (this one is ${subscription.status})`,
      400,
    );
  }
};

// Draft -> Quotation
export const sendQuotation = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);
  requireStatus(subscription, "draft", "sent as a quotation");

  subscription.quotationValidUntil = addDays(
    new Date(),
    subscription.validityDays,
  );
  subscription.setStatus("quotation", req.user._id);
  await subscription.save();

  sendSubscription(res, subscription);
});

// Quotation -> Confirmed (customers can accept their own quotation)
export const confirmSubscription = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);
  requireStatus(subscription, "quotation", "confirmed");

  if (subscription.quotationValidUntil < new Date()) {
    return next(new AppError("This quotation has expired", 400));
  }

  subscription.setStatus("confirmed", req.user._id);
  await subscription.save();

  sendSubscription(res, subscription);
});

// Confirmed -> Active, this is where billing starts
export const activateSubscription = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);
  requireStatus(subscription, "confirmed", "activated");

  subscription.billingAnchor = subscription.startDate;
  subscription.periodsBilled = 0;
  subscription.nextInvoiceDate = subscription.startDate;
  subscription.setStatus("active", req.user._id);
  await subscription.save();

  sendSubscription(res, subscription);
});

export const pauseSubscription = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);
  requireStatus(subscription, "active", "paused");

  if (!subscription.plan.allowPause) {
    return next(new AppError("This plan does not allow pausing", 400));
  }
  if (subscription.paused) {
    return next(new AppError("This subscription is already paused", 400));
  }

  subscription.paused = true;
  subscription.pausedAt = new Date();
  await subscription.save();

  sendSubscription(res, subscription);
});

// The paused time is not billed and is added to the end of the subscription
export const resumeSubscription = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);

  if (subscription.status !== "active" || !subscription.paused) {
    return next(new AppError("This subscription is not paused", 400));
  }

  const now = new Date();
  const pausedMs = now - subscription.pausedAt;
  const nextDue = subscription.nextInvoiceDate;

  // Time that was already paid for is kept, anything due is billed from today
  const resumeBillingAt =
    nextDue > subscription.pausedAt
      ? new Date(nextDue.getTime() + pausedMs)
      : now;

  subscription.billingAnchor = resumeBillingAt;
  subscription.periodsBilled = 0;
  subscription.nextInvoiceDate = resumeBillingAt;
  subscription.expiryDate = new Date(
    subscription.expiryDate.getTime() + pausedMs,
  );
  subscription.paused = false;
  subscription.pausedAt = undefined;
  await subscription.save();

  sendSubscription(res, subscription);
});

// Any open subscription can be closed, but an active one only if its plan allows
export const closeSubscription = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);

  if (subscription.status === "closed") {
    return next(new AppError("This subscription is already closed", 400));
  }
  if (
    subscription.status === "active" &&
    subscription.expiryDate > new Date() &&
    !subscription.plan.allowEarlyClose
  ) {
    return next(new AppError("This plan does not allow closing early", 400));
  }

  subscription.paused = false;
  subscription.pausedAt = undefined;
  subscription.setStatus("closed", req.user._id);
  await subscription.save();

  sendSubscription(res, subscription);
});

// Extends an active subscription, or brings a closed one back
export const renewSubscription = catchAsync(async (req, res, next) => {
  const subscription = await getSubscriptionForAction(req);

  if (!subscription.plan.allowRenew) {
    return next(new AppError("This plan does not allow renewing", 400));
  }
  if (!["active", "closed"].includes(subscription.status)) {
    return next(
      new AppError("Only active or closed subscriptions can be renewed", 400),
    );
  }

  const now = new Date();
  const term = subscription.expiryDate - subscription.startDate;
  const reopen = subscription.status === "closed";

  const expiryDate = req.body.expiryDate
    ? parseDate(req.body.expiryDate, "expiry date")
    : new Date((reopen ? now : subscription.expiryDate).getTime() + term);

  if (expiryDate <= now || (!reopen && expiryDate <= subscription.expiryDate)) {
    return next(
      new AppError("The new expiry date must be after the current one", 400),
    );
  }

  subscription.expiryDate = expiryDate;

  if (reopen) {
    // Billing starts again from today unless time is already paid for
    if (!subscription.nextInvoiceDate || subscription.nextInvoiceDate < now) {
      subscription.billingAnchor = now;
      subscription.periodsBilled = 0;
      subscription.nextInvoiceDate = now;
    }
    subscription.closedAt = undefined;
    subscription.setStatus("active", req.user._id);
  }
  await subscription.save();

  sendSubscription(res, subscription);
});
