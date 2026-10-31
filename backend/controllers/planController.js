import Plan from "../models/planModel.js";
import * as factory from "./handlerFactory.js";

export const getAllPlans = factory.getAll(Plan);
export const getPlan = factory.getOne(Plan);
export const createPlan = factory.createOne(Plan);
export const updatePlan = factory.updateOne(Plan);
export const deletePlan = factory.archiveOne(Plan);
