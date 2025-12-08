// =====================================================
//  IMPORTS
// =====================================================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// =====================================================
//  INITIALIZE APP
// =====================================================
const app = express();

// Allow all origins (production-safe for your use case)
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// =====================================================
//  CONNECT TO MONGO ATLAS
// =====================================================
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in Render environment!");
}

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// =====================================================
//  SCHEMAS — STRICT FALSE SO ANY FIELD WILL BE SAVED
// =====================================================
const assessmentSchema = new mongoose.Schema({}, { strict: false });
const blockSchema = new mongoose.Schema({}, { strict: false });

const Assessment = mongoose.model("assessments", assessmentSchema);
const BlockedUser = mongoose.model("blockedusers", blockSchema);

// =====================================================
//  ROUTES
// =====================================================

// Health Check
app.get("/", (req, res) => {
  res.send("Backend Running Successfully ✔");
});

// -------------------- SAVE ASSESSMENT --------------------
app.post("/api/assessments", async (req, res) => {
  try {
    console.log("📥 Incoming Assessment:", req.body);

    const result = await Assessment.create(req.body);

    console.log("✅ Assessment Saved:", result._id);

    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("❌ Save Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- GET ALL ASSESSMENTS --------------------
app.get("/api/assessments", async (req, res) => {
  try {
    const data = await Assessment.find().sort({ timestamp: -1 });
    return res.json(data);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    return res.json([]);
  }
});

// -------------------- BLOCK USER --------------------
app.post("/api/block", async (req, res) => {
  try {
    console.log("🚫 Blocking user:", req.body.email);

    await BlockedUser.create(req.body);
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Block Error:", err);
    return res.json({ success: false });
  }
});

// -------------------- GET BLOCKED USERS --------------------
app.get("/api/blocked", async (req, res) => {
  try {
    const data = await BlockedUser.find();
    return res.json(data);
  } catch (err) {
    console.error("❌ Fetch Block Error:", err);
    return res.json([]);
  }
});

// -------------------- UNBLOCK USER --------------------
app.delete("/api/block/:email", async (req, res) => {
  try {
    console.log("🔓 Unblocking:", req.params.email);

    await BlockedUser.deleteOne({ email: req.params.email });
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Unblock Error:", err);
    return res.json({ success: false });
  }
});

// -------------------- CHECK BLOCK STATUS --------------------
app.post("/api/check-block", async (req, res) => {
  try {
    const user = await BlockedUser.findOne({ email: req.body.email });
    return res.json({ isBlocked: !!user });
  } catch (err) {
    console.error("❌ Check Block Error:", err);
    return res.json({ isBlocked: false });
  }
});

// =====================================================
//  START SERVER
// =====================================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
