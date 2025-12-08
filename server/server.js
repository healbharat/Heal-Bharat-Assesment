// ------------------------------
//  IMPORTS
// ------------------------------
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ------------------------------
//  INITIALIZE APP
// ------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------
//  CONNECT MONGO
// ------------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ------------------------------
//  SCHEMAS (Dynamic – no strict fields)
// ------------------------------
const assessmentSchema = new mongoose.Schema({}, { strict: false });
const blockSchema = new mongoose.Schema({}, { strict: false });

const Assessment = mongoose.model("assessments", assessmentSchema);
const BlockedUser = mongoose.model("blockedusers", blockSchema);

// ------------------------------
//  ROUTES
// ------------------------------

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Running Successfully ✔");
});

// Save Assessment
app.post("/api/assessments", async (req, res) => {
  try {
    const result = await Assessment.create(req.body);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.log("Save Error:", err);
    return res.status(500).json({ success: false });
  }
});

// Get All Assessments
app.get("/api/assessments", async (req, res) => {
  try {
    const data = await Assessment.find().sort({ timestamp: -1 });
    return res.json(data);
  } catch (err) {
    console.log("Fetch Error:", err);
    return res.json([]);
  }
});

// Block User
app.post("/api/block", async (req, res) => {
  try {
    await BlockedUser.create(req.body);
    return res.json({ success: true });
  } catch (err) {
    console.log("Block Error:", err);
    return res.json({ success: false });
  }
});

// Get Blocked Users
app.get("/api/blocked", async (req, res) => {
  try {
    const data = await BlockedUser.find();
    return res.json(data);
  } catch (err) {
    console.log("Fetch Block Error:", err);
    return res.json([]);
  }
});

// Unblock User
app.delete("/api/block/:email", async (req, res) => {
  try {
    await BlockedUser.deleteOne({ email: req.params.email });
    return res.json({ success: true });
  } catch (err) {
    console.log("Unblock Error:", err);
    return res.json({ success: false });
  }
});

// Check if user is blocked
app.post("/api/check-block", async (req, res) => {
  try {
    const user = await BlockedUser.findOne({ email: req.body.email });
    return res.json({ isBlocked: !!user });
  } catch (err) {
    console.log("Check Block Error:", err);
    return res.json({ isBlocked: false });
  }
});

// ------------------------------
//  START SERVER
// ------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
