import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/userModel.js";

// Sign-up always creates a customer and only an admin can add staff, so the
// very first admin is created here:  npm run seed:admin
const seedAdmin = async () => {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Please set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`${ADMIN_EMAIL} already exists (role: ${existing.role}).`);
      return;
    }

    await User.create({
      name: ADMIN_NAME || "Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      passwordConfirm: ADMIN_PASSWORD,
      role: "admin",
    });

    console.log(`Admin ${ADMIN_EMAIL} created.`);
  } catch (error) {
    console.error("Could not create the admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
