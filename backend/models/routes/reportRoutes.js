import express from "express";
import * as reportController from "../controllers/reportController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.use(authController.protect, authController.restrictTo("admin", "staff"));

router.get("/dashboard", reportController.getDashboard);
router.get("/revenue", reportController.getRevenue);

export default router;
