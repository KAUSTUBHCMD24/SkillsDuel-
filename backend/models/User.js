const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    xp: { type: Number, default: 0 },
    rank: { type: String, default: "Beginner" },
    badges: { type: [String], default: [] },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
    matchHistory: [{
        opponent: String,
        result: String, // 'Win', 'Loss', 'Draw'
        xpEarned: Number,
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', UserSchema);