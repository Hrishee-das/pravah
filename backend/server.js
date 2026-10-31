import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { startBillingScheduler } from "./utils/billingScheduler.js";

const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGO_URI;

const connectDB = async () => {
  if (!mongoUri) {
    console.error("MONGO_URI is not configured.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB Connected Successfully!");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    startBillingScheduler();
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

connectDB();
