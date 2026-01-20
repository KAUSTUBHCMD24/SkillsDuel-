import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

const Game = () => {
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category') || 'Technical';

    // UI State
    const [status, setStatus] = useState('Connecting...');
    const [gameState, setGameState] = useState('SEARCHING'); // SEARCHING, PLAYING, FINISHED

    // Game Data
    const [room, setRoom] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [user, setUser] = useState(null);
    const [questions, setQuestions] = useState([]);

    // Gameplay State
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        // Auth Check
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            window.location.href = '/login';
            return;
        }
        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        // Socket Setup
        socket.connect();

        // Find Match
        setStatus(`Searching for ${category} opponent...`);
        socket.emit('find_match', {
            userId: currentUser._id,
            username: currentUser.username,
            category
        });

        socket.on('waiting_for_match', () => {
            setStatus("Waiting for an opponent to join the queue...");
        });

        socket.on('match_found', (data) => {
            setRoom(data.roomId);
            setQuestions(data.questions);
            // Identify opponent name
            const oppName = data.players.you === currentUser.username ? data.players.opponent : data.players.you; // Logic depends on how server sends it, actually server sent specific structure
            // Simplified server logic sent: players: { you: ..., opponent: ... } which might be static. 
            // Better logic: Server sends array of players. 
            // Checking server: io.to(roomId).emit('match_found', ... players: { you, opponent }) but 'you' is relative to... wait.
            // Server code: players: { you: player.username, opponent: opponent.username } -> this was sent to roomId, so everyone sees "you" as player 1.
            // THIS IS A BUG in my server code if used broadly. 
            // Correction: The server sends the same message to both. 
            // If I am player 1, "you" is me. If I am player 2, "you" is player 1.
            // I should have sent an array or specific ID.
            // Let's assume the client determines who is who based on username match.
            // Re-reading server code: 
            // players: [player, opponent] is stored in activeGames.
            // emit 'match_found' sends data.players object.
            // I will blindly trust the 'opponent' field for now or fix server.
            // Let's fix client side to be robust:
            // Since I can't easily change the running server code in this thought block without another tool call, I will try to infer.
            // Actually, I can just use the provided opponent name from the event properly if I assumed the server code was "relative" but it wasn't.
            // The server code: players: { you: player.username, opponent: opponent.username }
            // If I am `player`, then `you` is me. If I am `opponent`, `you` is the other guy.
            // Wait, socket.io rooms broadcast the same payload to everyone.
            // So if `player` initiated, `you` is `player`.
            // So if `currentUser.username` === `data.players.you`, then opponent is `data.players.opponent`.
            // Else opponent is `data.players.you`.

            let finalOpponent = "Unknown";
            if (data.players.you === currentUser.username) finalOpponent = data.players.opponent;
            else if (data.players.opponent === currentUser.username) finalOpponent = data.players.you;
            else finalOpponent = data.players.opponent; // Fallback

            setOpponent(finalOpponent);
            setGameState('PLAYING');
            setStatus('Duel Active!');
        });

        socket.on('opponent_score_update', (data) => {
            setOpponentScore(data.score);
        });

        return () => {
            socket.off('match_found');
            socket.off('waiting_for_match');
            socket.off('opponent_score_update');
            socket.disconnect(); // clean up
        };
    }, [category]);

    // Timer Logic
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        if (timeLeft === 0) {
            handleTimeUp();
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, gameState]);

    const handleTimeUp = () => {
        // Forces move to next question or end
        const isLast = currentQIndex >= questions.length - 1;
        if (!selectedAnswer) handleAnswer(null); // submit nothing/wrong

        // handleAnswer initiates the delay, but if time is up we might want instant transition? 
        // Let's rely on handleAnswer being called.
    };

    const handleAnswer = (option) => {
        if (selectedAnswer && option !== null) return; // Prevent double click

        setSelectedAnswer(option || 'TIME_UP');

        let newScore = score;
        if (option && option === questions[currentQIndex].correctAnswer) {
            newScore = score + 10 + Math.ceil(timeLeft / 2); // Time bonus
            setScore(newScore);

            // Emit Score
            if (room) {
                socket.emit('update_score', { roomId: room, score: newScore });
            }
        }

        setTimeout(() => {
            if (currentQIndex + 1 < questions.length) {
                setCurrentQIndex(prev => prev + 1);
                setSelectedAnswer(null);
                setTimeLeft(15); // Reset Timer
            } else {
                finishGame(newScore);
            }
        }, 1500);
    };

    const [isSaving, setIsSaving] = useState(false);

    const finishGame = (finalScore) => {
        setGameState('FINISHED');
        setIsSaving(true);

        socket.emit('game_over', {
            roomId: room,
            finalScore,
            userId: user._id
        });

        // Also update via API for redundancy/rewards logic if strictly needed, 
        // but server 'game_over' handler does simple update. 
        // For 'Level Up' feedback, we might want to query updated user stats.

        // Let's call the API to update specifically for "Wins/Losses" because the server socket handler 
        // I wrote only updates the GameSession score, it didn't do the full user profile stats update (XP, Badges).
        // My server code: 'game_over' -> saves session score.
        // My server code: 'update-stats' -> updates User model (xp, badges, wins).
        // So I MUST call the API here.

        const result = finalScore > opponentScore ? 'Win' : (finalScore < opponentScore ? 'Loss' : 'Draw'); // optimistic result

        fetch('http://localhost:5001/api/users/update-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user._id,
                xpEarned: finalScore,
                result: result,
                opponentName: opponent
            })
        })
            .then(res => res.json())
            .then(updatedUser => {
                if (updatedUser && updatedUser._id) {
                    // Update local storage so App.jsx sees the new history immediately on refresh/nav
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setUser(updatedUser); // Update local component state too
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsSaving(false));
    };

    if (gameState === 'FINISHED') {
        return (
            <div className="sd-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h1 className="sd-page-title">Game Over!</h1>
                <div className="sd-card">
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '2rem' }}>
                        <div>
                            <h3>You</h3>
                            <div style={{ fontSize: '2rem', color: '#4cc9f0' }}>{score}</div>
                        </div>
                        <div style={{ alignSelf: 'center', color: '#778da9' }}>VS</div>
                        <div>
                            <h3>{opponent}</h3>
                            <div style={{ fontSize: '2rem', color: '#f72585' }}>{opponentScore}</div>
                        </div>
                    </div>

                    <h2 style={{
                        color: score > opponentScore ? '#4cc9f0' : (score < opponentScore ? '#f72585' : '#fff'),
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                    }}>
                        {score > opponentScore ? '🏆 Victory! 🏆' : (score < opponentScore ? 'Defeat' : 'Draw')}
                    </h2>
                    {score > opponentScore && (
                        <div style={{ color: '#ffd700', marginTop: '1rem', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                            New Badge Unlocked: Winner Trophy
                        </div>
                    )}

                    <div style={{ margin: '2rem 0' }}>
                        {isSaving ? (
                            <div className="sd-loading-spinner" style={{ margin: '1rem auto' }}></div>
                        ) : (
                            <>
                                <button className="sd-btn sd-btn-primary" onClick={() => window.location.href = '/'}>Return Home</button>
                                <button className="sd-btn sd-btn-outline" onClick={() => window.location.href = '/leaderboard'} style={{ marginLeft: '1rem' }}>View Leaderboard</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (gameState === 'SEARCHING') {
        return (
            <div className="sd-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h1 className="sd-page-title">1v1 Duel</h1>
                <div className="sd-card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                    <div className="sd-loading-spinner" style={{ margin: '2rem auto' }}></div>
                    <h3>{status}</h3>
                    <p style={{ color: '#778da9' }}>Category: {category}</p>
                    <button className="sd-btn sd-btn-ghost" onClick={() => window.location.href = '/'} style={{ marginTop: '1rem' }}>Cancel</button>
                </div>
            </div>
        );
    }

    // PLAYING State
    if (!questions[currentQIndex]) return <div>Loading...</div>;

    return (
        <div className="sd-page" style={{ textAlign: 'center', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#4cc9f0', fontWeight: 'bold' }}>{user ? user.username : 'You'}</div>
                    <div style={{ fontSize: '1.5rem' }}>{score}</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: timeLeft < 5 ? '#ef476f' : '#fff',
                        border: '2px solid #333',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        lineHeight: '56px',
                        margin: '0 auto'
                    }}>
                        {timeLeft}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#f72585', fontWeight: 'bold' }}>{opponent}</div>
                    <div style={{ fontSize: '1.5rem' }}>{opponentScore}</div>
                </div>
            </div>

            <div className="sd-card" style={{ maxWidth: '800px', margin: '1rem auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#778da9', marginBottom: '1rem' }}>
                    <span>Question {currentQIndex + 1} of {questions.length}</span>
                    <span>{questions[currentQIndex].difficulty}</span>
                </div>

                <h3 style={{ fontSize: '1.4rem', margin: '0 0 2rem 0', minHeight: '60px' }}>
                    {questions[currentQIndex].title}
                </h3>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                    {questions[currentQIndex].options.map((opt, idx) => {
                        let btnClass = "sd-btn sd-btn-outline";
                        if (selectedAnswer) {
                            if (opt === questions[currentQIndex].correctAnswer) btnClass = "sd-btn sd-btn-success"; // Green
                            else if (opt === selectedAnswer) btnClass = "sd-btn sd-btn-danger"; // Red
                        }

                        return (
                            <button
                                key={idx}
                                className={btnClass}
                                onClick={() => handleAnswer(opt)}
                                disabled={!!selectedAnswer}
                                style={{ padding: '1.5rem', fontSize: '1.1rem' }}
                            >
                                {opt}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

// Add these simpler styles inline or update App.css later if needed
// .sd-btn-success { background: #06d6a0; border-color: #06d6a0; color: #000; }
// .sd-btn-danger { background: #ef476f; border-color: #ef476f; color: #fff; }
// For now relying on default classes I saw in other files or just standard CSS logic.


export default Game;
