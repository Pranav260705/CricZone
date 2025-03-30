const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/cricketDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// Player Schema
const PlayerSchema = new mongoose.Schema({
    name: String,
    role: String,
    runs: Number,
    wickets: Number,
    matches: Number,
    team: String,
    nationality: String,
    profileUrl: String
});

const Player = mongoose.model("Player", PlayerSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

// Auth Routes
// Signup
app.post("/auth/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: "Username or email already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Create token
        const token = jwt.sign({ id: user._id }, 'your-secret-key', { expiresIn: '24h' });

        res.status(201).json({
            message: "User created successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Login
app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Create token
        const token = jwt.sign({ id: user._id }, 'your-secret-key', { expiresIn: '24h' });

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to login" });
    }
});

// Routes

// Get all players
app.get("/players", authenticateToken, async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch players" });
    }
});

// Add a new player
app.post("/players", authenticateToken, async (req, res) => {
    try {
        const newPlayer = new Player(req.body);
        await newPlayer.save();
        res.json(newPlayer);
    } catch (error) {
        res.status(500).json({ error: "Failed to add player" });
    }
});

// Update a player
app.put("/players/:id", authenticateToken, async (req, res) => {
    try {
        const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedPlayer);
    } catch (error) {
        res.status(500).json({ error: "Failed to update player" });
    }
});

// Get player by ID
app.get("/players/:id", authenticateToken, async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch player" });
    }
});

// Delete a player
app.delete("/players/:id", authenticateToken, async (req, res) => {
    try {
        await Player.findByIdAndDelete(req.params.id);
        res.json({ message: "Player deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete player" });
    }
});

// Start Server
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});


