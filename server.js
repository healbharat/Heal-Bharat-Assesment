import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ------------------ MIDDLEWARE ------------------
app.use(
  cors({
    origin: "https://heal-bharat-assesment-1.onrender.com",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(bodyParser.json({ limit: "50mb" }));

// ------------------ MONGODB CONNECT ------------------
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ------------------ SCHEMAS ------------------
const ResultSchema = new mongoose.Schema({
  questionId: String,
  transcription: String,
  overallScore: Number,
  clarity: Object,
  confidence: Object,
  contentQuality: Object,
  grammarAndFluency: Object,
  keyTakeaways: [String],
  improvementTips: [String],
});

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
  results: [ResultSchema],
});

const BlockedUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  timestamp: Number,
  reason: String,
});

const Assessment = mongoose.model("Assessment", AssessmentSchema);
const BlockedUser = mongoose.model("BlockedUser", BlockedUserSchema);

// ------------------ API ROUTES ------------------

// Save assessment
app.post("/api/assessments", async (req, res) => {
  try {
    const newRecord = new Assessment(req.body);
    await newRecord.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Save failed" });
  }
});

// Get all assessments
app.get("/api/assessments", async (req, res) => {
  const list = await Assessment.find().sort({ timestamp: -1 });
  res.json(list);
});

// Check blocked
app.post("/api/check-block", async (req, res) => {
  const user = await BlockedUser.findOne({ email: req.body.email });
  res.json({ isBlocked: !!user });
});

// Block user
app.post("/api/block", async (req, res) => {
  const exists = await BlockedUser.findOne({ email: req.body.email });
  if (exists) return res.json({ message: "Already blocked" });

  const newUser = new BlockedUser({
    ...req.body,
    timestamp: Date.now(),
  });

  await newUser.save();
  res.json({ success: true });
});

// Unblock user
app.delete("/api/block/:email", async (req, res) => {
  await BlockedUser.deleteOne({ email: req.params.email });
  res.json({ success: true });
});

// Get all blocked users
app.get("/api/blocked", async (req, res) => {
  const users = await BlockedUser.find();
  res.json(users);
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
