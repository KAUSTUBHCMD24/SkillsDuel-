const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');

// GET /api/stats
router.get('/', async (req, res) => {
    try {
        // 1. Duels Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const duelsToday = await GameSession.countDocuments({
            createdAt: { $gte: startOfDay }
        });

        // 2. Avg Duel Time (Simple aggregation)
        // Only consider completed games with endedAt
        const avgTimeAgg = await GameSession.aggregate([
            { $match: { endedAt: { $exists: true } } },
            { $project: { duration: { $subtract: ["$endedAt", "$startedAt"] } } },
            { $group: { _id: null, avgDuration: { $avg: "$duration" } } }
        ]);

        let avgDuelTimeStr = "N/A";
        if (avgTimeAgg.length > 0) {
            const ms = avgTimeAgg[0].avgDuration;
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            avgDuelTimeStr = `${minutes}m ${seconds}s`;
        }

        // 3. Active Players (We need to pass io or something, but for now we might mock or query DB active sessions)
        // Since we can't easily access `io` here without dependency injection, 
        // We'll trust the GameSession 'Active' count + a multiplier or similar.
        // Better: Use `io.engine.clientsCount` if we move this strictly to server.js or export io.
        // For simplicity in this separated file, let's count "Active" game sessions * 2.

        // Alternative: Pass active player count from memory if possible, but let's query DB for "Active" status games.
        // Note: My GameSession logic doesn't strictly close match status to 'Completed' well yet.
        // So let's mock this part or improve the logic. 
        // Actually, let's just count GameSessions created in last 15 mins as "Active".

        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const activeSessions = await GameSession.countDocuments({
            updatedAt: { $gte: fifteenMinsAgo }
        });

        const estimatedActivePlayers = activeSessions * 2;

        // 4. Last Duel (Global)
        const lastDuel = await GameSession.findOne({ status: 'Completed' })
            .sort({ endedAt: -1 })
            .limit(1)
            .select('players category endedAt');

        res.json({
            activePlayers: estimatedActivePlayers > 0 ? estimatedActivePlayers : 0,
            duelsToday,
            avgDuelTime: avgDuelTimeStr,
            lastDuel
        });

    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

module.exports = router;
