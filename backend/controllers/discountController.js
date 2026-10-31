import Discount from "../models/discountModel.js";
import * as factory from "./handlerFactory.js";

const populateOptions = [
  { path: "products", select: "name" },
  { path: "subscriptions", select: "number" },
];

export const getAllDiscounts = factory.getAll(Discount, populateOptions);
export const getDiscount = factory.getOne(Discount, populateOptions);
export const createDiscount = factory.createOne(Discount);
export const updateDiscount = factory.updateOne(Discount);
export const deleteDiscount = factory.archiveOne(Discount);
