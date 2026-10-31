import express from "express";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRoutes.js";
import productRouter from "./routes/productRoutes.js";
import planRouter from "./routes/planRoutes.js";
import taxRouter from "./routes/taxRoutes.js";
import discountRouter from "./routes/discountRoutes.js";
import quotationTemplateRouter from "./routes/quotationTemplateRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import invoiceRouter from "./routes/invoiceRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import reportRouter from "./routes/reportRoutes.js";
import errorController from "./controllers/errorController.js";
import AppError from "./utils/appError.js";

const app = express();

app.disable("x-powered-by");
// Needed for filters like ?total[gte]=100 (Express 5 defaults to "simple")
app.set("query parser", "extended");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

// Test API route
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Test API is working" });
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/plans", planRouter);
app.use("/api/v1/taxes", taxRouter);
app.use("/api/v1/discounts", discountRouter);
app.use("/api/v1/quotation-templates", quotationTemplateRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/reports", reportRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorController);

export default app;
