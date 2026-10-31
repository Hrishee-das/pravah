import Product from "../models/productModel.js";
import * as factory from "./handlerFactory.js";

const populateOptions = { path: "taxes", select: "name type value" };

export const getAllProducts = factory.getAll(Product, populateOptions);
export const getProduct = factory.getOne(Product, populateOptions);
export const createProduct = factory.createOne(Product);
export const updateProduct = factory.updateOne(Product);
export const deleteProduct = factory.archiveOne(Product);
