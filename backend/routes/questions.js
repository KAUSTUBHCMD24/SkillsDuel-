const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// ADD QUESTION (Admin Panel feature)
router.post('/add', async (req, res) => {
    try {
        const newQuestion = new Question(req.body);
        const savedQuestion = await newQuestion.save();
        res.status(201).json(savedQuestion);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET QUESTIONS BY CATEGORY
router.get('/:category', async (req, res) => {
    try {
        const questions = await Question.find({ category: req.params.category });
        res.status(200).json(questions);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;