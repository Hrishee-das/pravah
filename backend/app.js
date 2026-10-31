import express from "express";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRoutes.js";
import errorController from "./controllers/errorController.js";
import AppError from "./utils/appError.js";

const app = express();

app.disable("x-powered-by");
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

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorController);

export default app;
