import express from "express";
import * as productController from "../controllers/productController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// Everyone on the team can look, only the admin can change
router.use(authController.protect, authController.restrictTo("admin", "staff"));

router
  .route("/")
  .get(productController.getAllProducts)
  .post(authController.restrictTo("admin"), productController.createProduct);

router
  .route("/:id")
  .get(productController.getProduct)
  .patch(authController.restrictTo("admin"), productController.updateProduct)
  .delete(authController.restrictTo("admin"), productController.deleteProduct);

export default router;
