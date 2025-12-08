const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: [
      "https://heal-bharat-assesment-1.onrender.com"  // frontend deployed URL
    ],
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json({ limit: "50mb" }));

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const assessmentSchema = new mongoose.Schema({}, { strict: false });
const blockSchema = new mongoose.Schema({}, { strict: false });
const Assessment = mongoose.model("assessments", assessmentSchema);
const BlockedUser = mongoose.model("blockedusers", blockSchema);

app.get("/", (req, res) => res.send("Backend Live"));

app.post("/api/assessments", async (req, res) => {
  try {
    await Assessment.create(req.body);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/api/assessments", async (req, res) => {
  const data = await Assessment.find().sort({ timestamp: -1 });
  res.json(data);
});

app.post("/api/check-block", async (req, res) => {
  const u = await BlockedUser.findOne({ email: req.body.email });
  res.json({ isBlocked: !!u });
});

app.post("/api/block", async (req, res) => {
  try {
    await BlockedUser.create({ ...req.body, timestamp: Date.now() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get("/api/blocked", async (req, res) => {
  const b = await BlockedUser.find().sort({ timestamp: -1 });
  res.json(b);
});

app.delete("/api/block/:email", async (req, res) => {
  try {
    await BlockedUser.deleteOne({ email: req.params.email });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
