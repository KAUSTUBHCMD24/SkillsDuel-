const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('./models/Question');

dotenv.config();

const questions = [
    // TECHNICAL
    {
        title: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
        correctAnswer: "O(log n)",
        category: "Technical",
        difficulty: "Beginner"
    },
    {
        title: "Which data structure uses LIFO?",
        options: ["Queue", "Stack", "Array", "Tree"],
        correctAnswer: "Stack",
        category: "Technical",
        difficulty: "Beginner"
    },
    {
        title: "In React, what hook is used for side effects?",
        options: ["useState", "useEffect", "useContext", "useReducer"],
        correctAnswer: "useEffect",
        category: "Technical",
        difficulty: "Intermediate"
    },
    {
        title: "What does SQL stand for?",
        options: ["Structured Query Language", "Simple Query Logic", "Standard Question List", "None"],
        correctAnswer: "Structured Query Language",
        category: "Technical",
        difficulty: "Beginner"
    },
    {
        title: "Which HTTP method is used to update a resource?",
        options: ["GET", "POST", "PUT", "DELETE"],
        correctAnswer: "PUT",
        category: "Technical",
        difficulty: "Intermediate"
    },
    // APTITUDE
    {
        title: "If 5 machines check 5 items in 5 minutes, how long for 100 machines to check 100 items?",
        options: ["5 minutes", "100 minutes", "1 minute", "20 minutes"],
        correctAnswer: "5 minutes",
        category: "Aptitude",
        difficulty: "Intermediate"
    },
    {
        title: "Complete the series: 2, 6, 12, 20, 30, ...",
        options: ["40", "42", "44", "46"],
        correctAnswer: "42",
        category: "Aptitude",
        difficulty: "Intermediate"
    },
    {
        title: "A train running at 60km/hr crosses a pole in 9 seconds. Length of train?",
        options: ["120 m", "150 m", "180 m", "324 m"],
        correctAnswer: "150 m",
        category: "Aptitude",
        difficulty: "Advanced"
    },
    {
        title: "What is 20% of 150?",
        options: ["20", "25", "30", "35"],
        correctAnswer: "30",
        category: "Aptitude",
        difficulty: "Beginner"
    },
    {
        title: "Average of first 5 multiples of 3?",
        options: ["3", "9", "12", "15"],
        correctAnswer: "9",
        category: "Aptitude",
        difficulty: "Beginner"
    },
    // LOGICAL
    // LOGICAL
    {
        title: "SCD, TEF, UGH, ____, WKL",
        options: ["ABC", "VIJ", "CMN", "UJI"],
        correctAnswer: "VIJ",
        category: "Logical Reasoning",
        difficulty: "Intermediate"
    },
    {
        title: "Statement: All mangoes are golden. Golden things are cheap. Conclusion?",
        options: ["All mangoes are cheap", "Golden mangoes are not cheap", "Cheap things are mangoes", "None"],
        correctAnswer: "All mangoes are cheap",
        category: "Logical Reasoning",
        difficulty: "Advanced"
    },
    {
        title: "Odd one out: 3, 5, 7, 12, 13, 17",
        options: ["3", "12", "13", "17"],
        correctAnswer: "12",
        category: "Logical Reasoning",
        difficulty: "Beginner"
    },
    {
        title: "Look at this series: 7, 10, 8, 11, 9, 12, ... What number should come next?",
        options: ["7", "10", "12", "13"],
        correctAnswer: "10",
        category: "Logical Reasoning",
        difficulty: "Intermediate"
    },
    {
        title: "Which word does not belong with the others?",
        options: ["Index", "Glossary", "Chapter", "Book"],
        correctAnswer: "Book",
        category: "Logical Reasoning",
        difficulty: "Beginner"
    },
    // EXTRA TECHNICAL (To reach 10+)
    { title: "HTML stands for?", options: ["Hyper Text Markup Language", "High Text Maker", "Hyper Links", "None"], correctAnswer: "Hyper Text Markup Language", category: "Technical", difficulty: "Beginner" },
    { title: "CSS stands for?", options: ["Cascading Style Sheets", "Creative Style Sheets", "Computer Style Sheets", "None"], correctAnswer: "Cascading Style Sheets", category: "Technical", difficulty: "Beginner" },
    { title: "JS stands for?", options: ["JavaSuper", "JustScript", "JavaScript", "Jordans"], correctAnswer: "JavaScript", category: "Technical", difficulty: "Beginner" },
    { title: "React is a...", options: ["Library", "Framework", "Language", "Database"], correctAnswer: "Library", category: "Technical", difficulty: "Intermediate" },
    { title: "Node.js is...", options: ["Runtime", "Framework", "Language", "Browser"], correctAnswer: "Runtime", category: "Technical", difficulty: "Intermediate" },

    // EXTRA APTITUDE
    { title: "10 + 20 / 2?", options: ["15", "20", "25", "30"], correctAnswer: "20", category: "Aptitude", difficulty: "Beginner" },
    { title: "Square root of 144?", options: ["10", "11", "12", "13"], correctAnswer: "12", category: "Aptitude", difficulty: "Beginner" },
    { title: "Next prime after 7?", options: ["9", "10", "11", "13"], correctAnswer: "11", category: "Aptitude", difficulty: "Beginner" },
    { title: "Speed = ?", options: ["Dist/Time", "Time/Dist", "Dist*Time", "None"], correctAnswer: "Dist/Time", category: "Aptitude", difficulty: "Beginner" },
    { title: "50% of 80?", options: ["40", "20", "60", "30"], correctAnswer: "40", category: "Aptitude", difficulty: "Beginner" },

    // EXTRA LOGICAL
    { title: "Day after tomorrow is Sunday. What was yesterday?", options: ["Thursday", "Wednesday", "Friday", "Monday"], correctAnswer: "Thursday", category: "Logical Reasoning", difficulty: "Intermediate" },
    { title: "A is father of B. B is mother of C. A is C's...?", options: ["Grandfather", "Father", "Uncle", "Brother"], correctAnswer: "Grandfather", category: "Logical Reasoning", difficulty: "Intermediate" },
    { title: "Find the missing number: 2, 4, 8, __, 32", options: ["16", "18", "20", "24"], correctAnswer: "16", category: "Logical Reasoning", difficulty: "Beginner" },
    { title: "Bird is to Fly as Fish is to...", options: ["Swim", "Water", "Gill", "Fin"], correctAnswer: "Swim", category: "Logical Reasoning", difficulty: "Beginner" },
    { title: "Complete: AZ, BY, CX, __", options: ["DW", "DV", "DU", "DX"], correctAnswer: "DW", category: "Logical Reasoning", difficulty: "Advanced" }
];

mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to MongoDB for Seeding");
        try {
            // Clear existing questions to avoid duplicates if re-run (optional, for safety)
            await Question.deleteMany({});

            await Question.insertMany(questions);
            console.log("Questions Seeded Successfully!");
            process.exit();
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    })
    .catch((err) => console.log(err));
