import express from "express";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

// Test API route
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Test API is working" });
});

export default app;
