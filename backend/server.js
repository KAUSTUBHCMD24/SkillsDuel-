const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require("socket.io");

// 1. Initialize App and Environment Variables
dotenv.config();
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: ["https://skillsduel-frontend.onrender.com"],
        methods: ["GET", "POST"]
    }
});

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Connect Routes
const authRoute = require('./routes/auth');
const questionsRoute = require('./routes/questions');
const usersRoute = require('./routes/users');

app.use('/api/auth', authRoute);
app.use('/api/questions', questionsRoute);
app.use('/api/users', usersRoute); // Leaderboard & Stats

// 4. Basic Test Route
app.get('/', (req, res) => {
    res.send("SkillDuels API is running...");
});

// 5. Socket.IO Logic
// 5. Socket.IO Logic
const Question = require('./models/Question');
const GameSession = require('./models/GameSession');
const User = require('./models/User');

let matchmakingQueue = []; // Array of { socketId, userId, username, category }
let activeGames = {}; // roomId -> { players: [socketId], scores: {}, questions: [] }

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log("User Disconnected", socket.id);
        // Remove from queue
        matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);

        // Clear any bot intervals for this socket if active
        // Implementation detail: we could track active intervals map
        // but for now relying on room clean up or natural timeout
    });

    socket.on('find_match', async ({ userId, username, category }) => {
        console.log(`User ${username} looking for match in ${category}`);

        // Check if anyone else is waiting in same category
        const opponentIndex = matchmakingQueue.findIndex(p => p.category === category && p.userId !== userId);

        if (opponentIndex > -1) {
            // HUMAN MATCH FOUND
            const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
            const player = { socketId: socket.id, userId, username, category };

            // Clear opponent's bot timer if it exists (requires tracking, skipping for simple prototype)
            // Ideally we store the timer ID on the queue object and clearTimeout it here.

            const roomId = `game_${player.userId}_${opponent.userId}`;
            socket.join(roomId);
            io.to(opponent.socketId).socketsJoin(roomId);

            startRealGame(roomId, player, opponent, category);

        } else {
            // NO MATCH YET -> ADD TO QUEUE & START BOT TIMER
            const queueEntry = { socketId: socket.id, userId, username, category };
            matchmakingQueue.push(queueEntry);
            socket.emit('waiting_for_match');

            // Bot Fallback after 3 seconds
            setTimeout(() => {
                // Check if still in queue
                const isInQueue = matchmakingQueue.find(p => p.socketId === socket.id);
                if (isInQueue) {
                    // Remove from queue
                    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);

                    // Start Bot Game
                    startBotGame(socket, userId, username, category);
                }
            }, 3000);
        }
    });

    socket.on('update_score', ({ roomId, score }) => {
        if (activeGames[roomId]) {
            activeGames[roomId].scores[socket.id] = score;
            socket.to(roomId).emit('opponent_score_update', { score });
        }
    });

    socket.on('game_over', async ({ roomId, finalScore, userId }) => {
        const game = activeGames[roomId];
        if (!game) return;

        try {
            const session = await GameSession.findById(game.dbId);
            if (!session) return;

            const playerIdx = session.players.findIndex(p => p.userId && p.userId.toString() === userId);
            if (playerIdx > -1) {
                session.players[playerIdx].score = finalScore;
            } else if (userId === 'BOT') {
                // Bot update handled differently usually
            }

            // Check if all players finished or just save
            // If bot game, we need to ensure bot score is saved too (done in bot loop or here)
            // For now, simple save.
            session.status = 'Completed';
            session.endedAt = Date.now();
            await session.save();

            // Broadcast update to all clients for live stats
            const lastDuel = await GameSession.findById(session._id).select('players category endedAt');
            io.emit('global_stats_update', { lastDuel });

        } catch (err) {
            console.error("Error saving game result:", err);
        }
    });
});

async function startRealGame(roomId, player1, player2, category) {
    try {
        const questions = await getQuestions(category);

        activeGames[roomId] = {
            players: [player1, player2],
            scores: { [player1.socketId]: 0, [player2.socketId]: 0 },
            questions: questions
        };

        io.to(roomId).emit('match_found', {
            roomId,
            questions: questions,
            players: {
                you: player1.username,
                opponent: player2.username
            }
        });

        const newGame = new GameSession({
            players: [
                { userId: player1.userId, username: player1.username },
                { userId: player2.userId, username: player2.username }
            ],
            questions: questions.map(q => q._id),
            category: category,
            status: 'Active'
        });
        await newGame.save();
        activeGames[roomId].dbId = newGame._id;
    } catch (err) {
        console.error("Error starting real game:", err);
    }
}

async function startBotGame(socket, userId, username, category) {
    const botName = "Bot_" + ["Alpha", "Beta", "Omega", "Zeta"][Math.floor(Math.random() * 4)];
    const roomId = `game_${userId}_bot`;
    socket.join(roomId);

    try {
        const questions = await getQuestions(category);

        activeGames[roomId] = {
            players: [{ socketId: socket.id, username }, { socketId: 'bot', username: botName }],
            scores: { [socket.id]: 0, 'bot': 0 },
            questions: questions
        };

        socket.emit('match_found', {
            roomId,
            questions: questions,
            players: {
                you: username,
                opponent: botName
            }
        });

        const newGame = new GameSession({
            players: [
                { userId: userId, username: username }, // Real user
                { username: botName, result: 'Pending' } // Bot has no ID
            ],
            questions: questions.map(q => q._id),
            category: category,
            status: 'Active'
        });
        await newGame.save();
        activeGames[roomId].dbId = newGame._id;

        // Simulate Bot Play
        let botScore = 0;
        let questionIdx = 0;

        const botInterval = setInterval(async () => {
            if (questionIdx >= questions.length) {
                clearInterval(botInterval);
                return;
            }

            // Bot answers
            const isCorrect = Math.random() > 0.3; // 70% win rate for bot (challenging)
            if (isCorrect) {
                botScore += 10 + Math.floor(Math.random() * 5);
            }

            // Emit update
            io.to(roomId).emit('opponent_score_update', { score: botScore });

            // Save Bot Score to DB periodically or at end?
            // Let's update DB at end of interval loop
            if (questionIdx === questions.length - 1) {
                const session = await GameSession.findById(newGame._id);
                if (session) {
                    session.players[1].score = botScore;
                    session.players[1].result = 'Pending'; // Will be Calc'd by user or final
                    await session.save();
                }
            }

            questionIdx++;
        }, 3000); // Answer every 3 seconds

    } catch (err) {
        console.error("Error starting bot game:", err);
    }
}

async function getQuestions(category) {
    // Get 10 random questions
    const questions = await Question.aggregate([
        { $match: { category: category } },
        { $sample: { size: 10 } }
    ]);
    return questions.length > 0 ? questions : [];
}

// 7. Stats Route
app.use('/api/stats', require('./routes/stats'));

// 6. MongoDB Connection Logic
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("---------------------------------");
        console.log("✅ SUCCESS: MongoDB Connected!");
        console.log("---------------------------------");
    })
    .catch((err) => {
        console.log("---------------------------------");
        console.log("❌ ERROR: MongoDB Connection Failed");
        console.error("Reason:", err.message);
    });

// 7. Start Server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});