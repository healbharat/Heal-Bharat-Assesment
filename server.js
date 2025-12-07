// --------------------- IMPORTS ---------------------
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

// --------------------- APP INIT ---------------------
const app = express();
const PORT = process.env.PORT || 5000;

// --------------------- CORS FIX (IMPORTANT) ---------------------
app.use(cors({
    origin: "https://heal-bharat-assesment-1.onrender.com",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(bodyParser.json({ limit: "50mb" }));

// --------------------- MONGO CONNECTION ---------------------
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// --------------------- SCHEMAS ---------------------
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

// --------------------- MODELS ---------------------
const Assessment = mongoose.model("Assessment", AssessmentSchema);
const BlockedUser = mongoose.model("BlockedUser", BlockedUserSchema);

// --------------------- ROUTES ---------------------

// Save Assessment
app.post("/api/assessments", async (req, res) => {
    try {
        const newAssessment = new Assessment(req.body);
        await newAssessment.save();
        res.status(201).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to save assessment" });
    }
});

// Get Assessments
app.get("/api/assessments", async (_req, res) => {
    try {
        const result = await Assessment.find().sort({ timestamp: -1 });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch" });
    }
});

// Check Block
app.post("/api/check-block", async (req, res) => {
    try {
        const user = await BlockedUser.findOne({ email: req.body.email });
        res.json({ isBlocked: !!user });
    } catch (e) {
        res.status(500).json({ error: "Failed to check block" });
    }
});

// Block User
app.post("/api/block", async (req, res) => {
    try {
        const { name, email, phone, reason } = req.body;

        const exists = await BlockedUser.findOne({ email });
        if (exists) return res.json({ message: "Already blocked" });

        await new BlockedUser({
            name,
            email,
            phone,
            reason,
            timestamp: Date.now()
        }).save();

        res.status(201).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to block user" });
    }
});

// Unblock
app.delete("/api/block/:email", async (req, res) => {
    try {
        await BlockedUser.deleteOne({ email: req.params.email });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to unblock" });
    }
});

// Get Blocked
app.get("/api/blocked", async (_req, res) => {
    try {
        const users = await BlockedUser.find().sort({ timestamp: -1 });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch" });
    }
});

// --------------------- START SERVER ---------------------
app.listen(PORT, () => console.log(`🚀 Server Running on PORT ${PORT}`));
