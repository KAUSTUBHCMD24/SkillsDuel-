const mongoose = require('mongoose');

const GameSessionSchema = new mongoose.Schema({
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        score: { type: Number, default: 0 },
        result: { type: String, enum: ['Win', 'Loss', 'Draw', 'Pending'], default: 'Pending' }
    }],
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    winner: { type: String, default: null }, // Username or User ID
    status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
    category: String,
    startedAt: { type: Date, default: Date.now },
    endedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('GameSession', GameSessionSchema);
