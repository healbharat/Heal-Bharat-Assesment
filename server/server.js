/**
 * TRONEX PLATFORM - BACKEND SERVER (UPDATED)
 * Railway / Render / MongoDB Atlas Compatible
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Auto-port for Railway/Render
const PORT = process.env.PORT || 5000;

// MongoDB URI from Railway → Variables (MONGO_URI)
const MONGO_URI = process.env.MONGO_URI;

// --------------------- MIDDLEWARE ---------------------
app.use(
  cors({
    origin: "*", // your frontend URL add करायचं असेल तर येथे टाका
    methods: ["GET", "POST", "DELETE"],
  })
);

app.use(bodyParser.json({ limit: "50mb" }));

// --------------------- MONGODB CONNECTION ---------------------

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    console.log("⏳ Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
}
connectDB();

// --------------------- SCHEMAS ---------------------

// Sub-document schema for communication results
const ResultSchema = new mongoose.Schema(
  {
    questionId: String,
    transcription: String,
    overallScore: Number,

    clarity: { score: Number, reasoning: String },
    confidence: { score: Number, reasoning: String },
    contentQuality: { score: Number, reasoning: String },
    grammarAndFluency: { score: Number, reasoning: String },

    keyTakeaways: [String],
    improvementTips: [String],
  },
  { _id: false }
);

// Main assessment schema
const AssessmentSchema = new mongoose.Schema({
  id: String,
  timestamp: Number,

  name: String,
  email: { type: String, index: true },
  phone: String,

  topic: String,
  difficulty: String,

  aptitudeScore: Number,
  technicalScore: Number,
  communicationScore: Number,
  overallScore: Number,

  results: { type: [ResultSchema], default: [] },
});

// Blocked user schema
const BlockedUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, index: true, unique: true },
  phone: String,
  timestamp: Number,
  reason: String,
});

// --------------------- MODELS ---------------------
const Assessment = mongoose.model("assessments", AssessmentSchema);
const BlockedUser = mongoose.model("blockedusers", BlockedUserSchema);

// --------------------- ROUTES ---------------------

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", uptime: process.uptime() });
});

// Save assessment
app.post("/api/assessments", async (req, res) => {
  try {
    if (!req.body.name || !req.body.email) {
      return res.status(400).json({ success: false, error: "Invalid data" });
    }

    const newAssessment = new Assessment(req.body);
    await newAssessment.save();

    console.log(`📝 Assessment saved → ${req.body.email}`);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("❌ Save Assessment Error:", error);
    res.status(500).json({ success: false });
  }
});

// Fetch all assessments
app.get("/api/assessments", async (req, res) => {
  try {
    const records = await Assessment.find().sort({ timestamp: -1 });
    res.json(records);
  } catch (error) {
    console.log("❌ Fetch Error:", error);
    res.status(500).json([]);
  }
});

// Check if user is blocked
app.post("/api/check-block", async (req, res) => {
  try {
    const user = await BlockedUser.findOne({ email: req.body.email });
    res.json({ isBlocked: !!user });
  } catch (error) {
    res.json({ isBlocked: false });
  }
});

// Block user
app.post("/api/block", async (req, res) => {
  try {
    const { name, email, phone, reason } = req.body;

    if (!email) return res.json({ success: false });

    const already = await BlockedUser.findOne({ email });

    if (already) {
      return res.json({ message: "Already blocked" });
    }

    await new BlockedUser({
      name,
      email,
      phone,
      timestamp: Date.now(),
      reason,
    }).save();

    console.log(`🚫 Blocked → ${email}`);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("❌ Block Error:", error);
    res.json({ success: false });
  }
});

// Unblock user
app.delete("/api/block/:email", async (req, res) => {
  try {
    await BlockedUser.deleteOne({ email: req.params.email });
    console.log(`✔ Unblocked → ${req.params.email}`);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// Get all blocked users
app.get("/api/blocked", async (req, res) => {
  try {
    const users = await BlockedUser.find().sort({ timestamp: -1 });
    res.json(users);
  } catch (error) {
    res.json([]);
  }
});

// --------------------- START SERVER ---------------------
app.listen(PORT, () =>
  console.log(`🚀 Server running successfully on PORT: ${PORT}`)
);
