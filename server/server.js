// ------------------------------
//  IMPORTS
// ------------------------------
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ------------------------------
//  PORT
// ------------------------------
const PORT = process.env.PORT || 10000;

// ------------------------------
//  FIXED CORS (VERY IMPORTANT)
// ------------------------------
app.use(
  cors({
    origin: [
      "https://heal-bharat-assesment-1.onrender.com",  // FRONTEND URL
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight request support
app.options("*", cors());

// ------------------------------
//  BODY PARSER
// ------------------------------
app.use(express.json({ limit: "50mb" }));

// ------------------------------
//  MONGO CONNECTION
// ------------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ------------------------------
//  SCHEMAS
// ------------------------------
const assessmentSchema = new mongoose.Schema({}, { strict: false });
const blockSchema = new mongoose.Schema({}, { strict: false });

const Assessment = mongoose.model("assessments", assessmentSchema);
const BlockedUser = mongoose.model("blockedusers", blockSchema);

// ------------------------------
//  ROUTES
// ------------------------------

// Root route
app.get("/", (req, res) => {
  res.send("🟢 Heal Bharat Backend Running Successfully");
});

// Save Assessment
app.post("/api/assessments", async (req, res) => {
  try {
    const saved = await Assessment.create(req.body);
    res.status(200).json({ success: true, saved });
  } catch (err) {
    console.log("Save Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all assessments
app.get("/api/assessments", async (req, res) => {
  try {
    const list = await Assessment.find().sort({ timestamp: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Block user
app.post("/api/block", async (req, res) => {
  try {
    await BlockedUser.create({ ...req.body, timestamp: Date.now() });
    res.json({ success: true });
  } catch (err) {
    console.log("Block Error:", err);
    res.json({ success: false });
  }
});

// Get blocked users
app.get("/api/blocked", async (req, res) => {
  try {
    const users = await BlockedUser.find().sort({ timestamp: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Unblock user
app.delete("/api/block/:email", async (req, res) => {
  try {
    await BlockedUser.deleteOne({ email: req.params.email });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Check if user is blocked
app.post("/api/check-block", async (req, res) => {
  try {
    const found = await BlockedUser.findOne({ email: req.body.email });
    res.json({ isBlocked: !!found });
  } catch (err) {
    res.json({ isBlocked: false });
  }
});

// ------------------------------
//  START SERVER
// ------------------------------
app.listen(PORT, () =>
  console.log(`🚀 Backend running on PORT: ${PORT}`)
);
