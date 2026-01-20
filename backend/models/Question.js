const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    options: {
        type: [String],
        required: true
    },
    correctAnswer: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: "Technical"
    },
    difficulty: {
        type: String,
        default: "Intermediate"
    }
}, { timestamps: true });

module.exports = mongoose.model("Question", QuestionSchema);