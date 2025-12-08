import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json());

// --------------------------------------------
// MongoDB CONNECTION
// --------------------------------------------
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// --------------------------------------------
// MODELS
// --------------------------------------------
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
  results: Array
});

const BlockedUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  timestamp: Number,
  reason: String
});

const Assessment = mongoose.model("Assessment", AssessmentSchema);
const BlockedUser = mongoose.model("BlockedUser", BlockedUserSchema);

// --------------------------------------------
// ROUTES
// --------------------------------------------

// SAVE ASSESSMENT
app.post("/api/assessments", async (req, res) => {
  try {
    await Assessment.create(req.body);
    res.status(200).json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// GET ASSESSMENTS
app.get("/api/assessments", async (req, res) => {
  const data = await Assessment.find().sort({ timestamp: -1 });
  res.json(data);
});

// BLOCK USER
app.post("/api/block", async (req, res) => {
  await BlockedUser.create(req.body);
  res.json({ message: "User Blocked" });
});

// UNBLOCK USER
app.delete("/api/block/:email", async (req, res) => {
  await BlockedUser.deleteOne({ email: req.params.email });
  res.json({ message: "User Unblocked" });
});

// CHECK BLOCK
app.post("/api/check-block", async (req, res) => {
  const exists = await BlockedUser.findOne({ email: req.body.email });
  res.json({ isBlocked: !!exists });
});

// GET BLOCKED USERS
app.get("/api/blocked", async (req, res) => {
  const list = await BlockedUser.find();
  res.json(list);
});

// --------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Backend running on port", PORT));
