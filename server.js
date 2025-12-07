/**
 * TRONEX PLATFORM - BACKEND SERVER
 *
 * Production Ready for Railway + MongoDB Atlas
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Railway will give PORT automatically
const PORT = process.env.PORT || 5000;

// MongoDB Atlas URI from Railway → Variables → MONGO_URI
const MONGO_URI = process.env.MONGO_URI;

// --------------------- MIDDLEWARE ---------------------
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for audio/base64 data

// --------------------- MONGODB CONNECTION ---------------------
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

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

    // Student Details
    name: String,
    email: { type: String, index: true },
    phone: String,

    // Assessment Meta
    topic: String,
    difficulty: String,

    // Scores
    aptitudeScore: Number,
    technicalScore: Number,
    communicationScore: Number,
    overallScore: Number,

    // Detailed Results
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
const Assessment = mongoose.model('Assessment', AssessmentSchema);
const BlockedUser = mongoose.model('BlockedUser', BlockedUserSchema);

// --------------------- API ROUTES ---------------------

// 1. Save Assessment
app.post('/api/assessments', async (req, res) => {
    try {
        const newAssessment = new Assessment(req.body);
        await newAssessment.save();
        console.log(`📝 Assessment saved for ${req.body.name}`);
        res.status(201).json({ success: true, message: 'Assessment saved' });
    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ success: false, error: 'Failed to save assessment' });
    }
});

// 2. Get All Assessments
app.get('/api/assessments', async (req, res) => {
    try {
        const records = await Assessment.find().sort({ timestamp: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// 3. Check Block Status
app.post('/api/check-block', async (req, res) => {
    try {
        const user = await BlockedUser.findOne({ email: req.body.email });
        res.json({ isBlocked: !!user });
    } catch (error) {
        res.status(500).json({ error: 'Error checking block status' });
    }
});

// 4. Block User
app.post('/api/block', async (req, res) => {
    try {
        const { name, email, phone, reason } = req.body;

        const existing = await BlockedUser.findOne({ email });
        if (existing) {
            return res.json({ message: 'User already blocked' });
        } 

        const blockedUser = new BlockedUser({
            name,
            email,
            phone,
            timestamp: Date.now(),
            reason
        });

        await blockedUser.save();
        console.log(`🚫 User blocked: ${email}`);
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to block user' });
    }
});

// 5. Unblock User
app.delete('/api/block/:email', async (req, res) => {
    try {
        await BlockedUser.deleteOne({ email: req.params.email });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});

// 6. Get Blocked Users
app.get('/api/blocked', async (req, res) => {
    try {
        const users = await BlockedUser.find().sort({ timestamp: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blocked users' });
    }
});

// --------------------- START SERVER ---------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on PORT: ${PORT}`);
});
