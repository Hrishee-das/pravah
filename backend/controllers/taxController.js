import Tax from "../models/taxModel.js";
import * as factory from "./handlerFactory.js";

export const getAllTaxes = factory.getAll(Tax);
export const getTax = factory.getOne(Tax);
export const createTax = factory.createOne(Tax);
export const updateTax = factory.updateOne(Tax);
export const deleteTax = factory.archiveOne(Tax);
