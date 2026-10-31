import express from "express";
import * as quotationTemplateController from "../controllers/quotationTemplateController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// Everyone on the team can look, only the admin can change
router.use(authController.protect, authController.restrictTo("admin", "staff"));

router
  .route("/")
  .get(quotationTemplateController.getAllTemplates)
  .post(authController.restrictTo("admin"), quotationTemplateController.createTemplate);

router
  .route("/:id")
  .get(quotationTemplateController.getTemplate)
  .patch(authController.restrictTo("admin"), quotationTemplateController.updateTemplate)
  .delete(authController.restrictTo("admin"), quotationTemplateController.deleteTemplate);

export default router;
