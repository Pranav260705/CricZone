const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

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

// Player Schema
const PlayerSchema = new mongoose.Schema({
    name: String,
    role: String,
    runs: Number,
    matches: Number,
    profileUrl: String
});

const Player = mongoose.model("Player", PlayerSchema);

// Routes

// Get all players
app.get("/players", async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch players" });
    }
});

// Add a new player
app.post("/players", async (req, res) => {
    try {
        const newPlayer = new Player(req.body);
        await newPlayer.save();
        res.json(newPlayer);
    } catch (error) {
        res.status(500).json({ error: "Failed to add player" });
    }
});

// Update a player
app.put("/players/:id", async (req, res) => {
    try {
        const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedPlayer);
    } catch (error) {
        res.status(500).json({ error: "Failed to update player" });
    }
});

// Delete a player
app.delete("/players/:id", async (req, res) => {
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


