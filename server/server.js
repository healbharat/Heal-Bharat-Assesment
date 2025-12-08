/**
 * TRONEX PLATFORM - BACKEND SERVER
 * Production Ready for Render / Railway + MongoDB Atlas
 */

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

// ----------------------------
// PORT + MONGO CONFIG
// ----------------------------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ----------------------------
// GLOBAL CORS FIX (100% WORKING)
// ----------------------------
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // allow all domains
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // FIX preflight problems
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ----------------------------
// BODY PARSER
// ----------------------------
app.use(bodyParser.json({ limit: "50mb" })); // allows audio base64 data

// ----------------------------
// MONGO CONNECTION
// ----------------------------
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ----------------------------
// SCHEMAS
// ----------------------------
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

const AssessmentSchema = new mongoose.Schema({
  id: String,
  timestamp: Number,
  name: String,
  email: String,
  phone: String,
  topic: String,
  difficulty: String,
  aptitudeScore: Number,
  technicalScore: Number,
  communicationScore: Number,
  overallScore: Number,
  results: { type: [ResultSchema], default: [] },
});

const BlockedUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  timestamp: Number,
  reason: String,
});

// ----------------------------
// MODELS
// ----------------------------
const Assessment = mongoose.model("Assessment", AssessmentSchema);
const BlockedUser = mongoose.model("BlockedUser", BlockedUserSchema);

// ----------------------------
// ROUTES
// ----------------------------

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Running Successfully ✔");
});

// SAVE ASSESSMENT
app.post("/api/assessments", async (req, res) => {
  try {
    const newDoc = new Assessment(req.body);
    await newDoc.save();
    console.log("📝 Assessment saved:", req.body.email);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ success: false });
  }
});

// GET ALL ASSESSMENTS
app.get("/api/assessments", async (req, res) => {
  try {
    const docs = await Assessment.find().sort({ timestamp: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// CHECK BLOCK
app.post("/api/check-block", async (req, res) => {
  try {
    const user = await BlockedUser.findOne({ email: req.body.email });
    res.json({ isBlocked: !!user });
  } catch (err) {
    console.error(err);
    res.json({ isBlocked: false });
  }
});

// BLOCK USER
app.post("/api/block", async (req, res) => {
  try {
    const existing = await BlockedUser.findOne({ email: req.body.email });

    if (existing) {
      return res.json({ message: "Already Blocked" });
    }

    const doc = new BlockedUser({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      reason: req.body.reason,
      timestamp: Date.now(),
    });

    await doc.save();
    console.log("🚫 BLOCKED:", req.body.email);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// UNBLOCK USER
app.delete("/api/block/:email", async (req, res) => {
  try {
    await BlockedUser.deleteOne({ email: req.params.email });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// GET BLOCKED USERS
app.get("/api/blocked", async (req, res) => {
  try {
    const docs = await BlockedUser.find().sort({ timestamp: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// ----------------------------
// START SERVER
// ----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server is running at PORT ${PORT}`);
});
