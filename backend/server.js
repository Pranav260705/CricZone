const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5001', 'http://localhost:5001', 'http://127.0.0.1:5003'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
    }
}));

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
    if (!req.session.user) {
        return res.status(401).json({ error: "Access token required" });
    }
    next();
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

        // Set session
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        res.status(201).json({
            message: "User created successfully",
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

        // Set session
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        res.json({
            message: "Login successful",
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

// Logout
app.post("/auth/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
    });
});

// Check session
app.get("/auth/check-session", (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: "No active session" });
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

// Add a catch-all route to serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});


