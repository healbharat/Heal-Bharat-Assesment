const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "50mb" }));

// ⭐ MOST IMPORTANT (CORS FIX)
app.use(
  cors({
    origin: [
      "https://heal-bharat-assesment-1.onrender.com",
      "https://heal-bharat-assesment.onrender.com",
      "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight requests allowed
app.options("*", cors());

// ⭐ CONNECT MONGO
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ⭐ SCHEMAS
const assessmentSchema = new mongoose.Schema({}, { strict: false });
const blockSchema = new mongoose.Schema({}, { strict: false });

const Assessment = mongoose.model("assessments", assessmentSchema);
const BlockedUser = mongoose.model("blockedusers", blockSchema);

// ⭐ ROUTES
app.get("/", (req, res) => {
  res.send("Backend Running 👍");
});

app.post("/api/assessments", async (req, res) => {
  try {
    await Assessment.create(req.body);
    res.status(201).json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

app.get("/api/assessments", async (req, res) => {
  const data = await Assessment.find().sort({ timestamp: -1 });
  res.json(data);
});

app.post("/api/block", async (req, res) => {
  await BlockedUser.create(req.body);
  res.json({ success: true });
});

app.get("/api/blocked", async (req, res) => {
  const users = await BlockedUser.find();
  res.json(users);
});

app.delete("/api/block/:email", async (req, res) => {
  await BlockedUser.deleteOne({ email: req.params.email });
  res.json({ success: true });
});

app.post("/api/check-block", async (req, res) => {
  const user = await BlockedUser.findOne({ email: req.body.email });
  res.json({ isBlocked: !!user });
});

// ⭐ START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
