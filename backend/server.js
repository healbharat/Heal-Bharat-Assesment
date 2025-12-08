const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Database
mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));

// Schemas
const ResultSchema = new mongoose.Schema({ ... });
const AssessmentSchema = new mongoose.Schema({ ... });
const BlockedUserSchema = new mongoose.Schema({ ... });

const Assessment = mongoose.model("Assessment", AssessmentSchema);
const BlockedUser = mongoose.model("BlockedUser", BlockedUserSchema);

// Routes
app.post("/api/assessments", async (req, res) => {...});
app.get("/api/assessments", async (req, res) => {...});
app.post("/api/check-block", async (req, res) => {...});
app.post("/api/block", async (req, res) => {...});
app.delete("/api/block/:email", async (req, res) => {...});
app.get("/api/blocked", async (req, res) => {...});

// Start
app.listen(PORT, () => console.log(`Server Running on ${PORT}`));
