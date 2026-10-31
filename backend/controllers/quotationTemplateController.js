import QuotationTemplate from "../models/quotationTemplateModel.js";
import * as factory from "./handlerFactory.js";

const populateOptions = [
  { path: "plan", select: "name price billingPeriod" },
  { path: "lines.product", select: "name salesPrice variants" },
];

export const getAllTemplates = factory.getAll(
  QuotationTemplate,
  populateOptions,
);
export const getTemplate = factory.getOne(QuotationTemplate, populateOptions);
export const createTemplate = factory.createOne(QuotationTemplate);
export const updateTemplate = factory.updateOne(QuotationTemplate);
export const deleteTemplate = factory.archiveOne(QuotationTemplate);
