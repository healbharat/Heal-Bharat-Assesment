const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Render gives its own PORT
const PORT = process.env.PORT || 5000;

// MongoDB Atlas URI (Render → Environment Variable)
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ----------------------------------------------
// SCHEMAS
// ----------------------------------------------

const ResultSchema = new mongoose.Schema({
  questionId: String,
  transcription: String,
  overallScore: Number,

  clarity: { score: Number, reasoning: String },
  confidence: { score: Number, reasoning: String },
  contentQuality: { score: Number, reasoning: String },
  grammarAndFluency: { score: Number, reasoning: String },

  keyTakeaways: [String],
  improvementTips: [String]
});

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

  results: [ResultSchema]
});

const BlockedUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  timestamp: Number,
  reason: String
});

// MODELS
const Assessment = mongoose.model("Assessment", AssessmentSchema);
const BlockedUser = mongoose.model("BlockedUser", BlockedUserSchema);

// ----------------------------------------------
// API ROUTES
// ----------------------------------------------

// Save Assessment
app.post("/api/assessments", async (req, res) => {
  try {
    const doc = new Assessment(req.body);
    await doc.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Save failed", details: err });
  }
});

// Get All Assessments
app.get("/api/assessments", async (req, res) => {
  try {
    const data = await Assessment.find().sort({ timestamp: -1 });
    res.json(data);
  } catch {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Check Block Status
app.post("/api/check-block", async (req, res) => {
  const user = await BlockedUser.findOne({ email: req.body.email });
  res.json({ isBlocked: !!user });
});

// Block User
app.post("/api/block", async (req, res) => {
  try {
    const exists = await BlockedUser.findOne({ email: req.body.email });
    if (exists) return res.json({ message: "Already blocked" });

    const doc = new BlockedUser({ ...req.body, timestamp: Date.now() });
    await doc.save();
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: "Block failed" });
  }
});

// Unblock User
app.delete("/api/block/:email", async (req, res) => {
  await BlockedUser.deleteOne({ email: req.params.email });
  res.json({ success: true });
});

// Get all blocked users
app.get("/api/blocked", async (req, res) => {
  const users = await BlockedUser.find().sort({ timestamp: -1 });
  res.json(users);
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Backend running on ${PORT}`));
