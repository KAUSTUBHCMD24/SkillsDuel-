import React, { useEffect, useState } from 'react';
import '../Leaderboard.css';

const Leaderboard = () => {
    const [users, setUsers] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers('');
    }, []); // Initial load only

    const fetchUsers = async (query = '') => {
        try {
            const url = query
                ? `http://localhost:5001/api/users?search=${encodeURIComponent(query)}`
                : 'http://localhost:5001/api/users';

            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) setUsers(data);
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            fetchUsers(searchTerm);
        }
    };

    const filteredUsers = users.filter(user => user.username.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="sd-page">
            <h1 className="sd-page-title">Global Leaderboard</h1>

            <div className="sd-search-container">
                <input
                    type="text"
                    placeholder="Search player by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="sd-search-input"
                />
            </div>

            <div className="sd-glass-panel">
                <table className="sd-leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Badges (Rewards)</th>
                            <th>Recent History</th>
                            <th style={{ textAlign: 'right' }}>XP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user, index) => (
                            <tr key={user._id} className="sd-leaderboard-row">
                                <td>
                                    {index === 0 ? (
                                        <span className="sd-medal-icon sd-rank-gold">🥇</span>
                                    ) : index === 1 ? (
                                        <span className="sd-medal-icon">🥈</span>
                                    ) : index === 2 ? (
                                        <span className="sd-medal-icon">🥉</span>
                                    ) : (
                                        <span className="sd-rank">#{index + 1}</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className="sd-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', border: index < 3 ? '2px solid #4cc9f0' : '2px solid transparent' }}>
                                            {user.username[0].toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{user.username}</span>
                                    </div>
                                </td>
                                <td>
                                    {user.badges && user.badges.length > 0 ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {user.badges.map((b, i) => (
                                                <span key={i} className="sd-badge" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'rgba(76, 201, 240, 0.15)', color: '#4cc9f0', border: '1px solid rgba(76, 201, 240, 0.3)' }}>{b}</span>
                                            ))}
                                        </div>
                                    ) : <span style={{ opacity: 0.3, fontStyle: 'italic' }}>No badges yet</span>}
                                </td>
                                <td>
                                    {user.matchHistory && user.matchHistory.length > 0 ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {user.matchHistory.slice(-5).reverse().map((match, i) => (
                                                <div key={i} style={{
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    backgroundColor: match.result === 'Win' ? '#4cc9f0' : '#ef476f',
                                                    boxShadow: match.result === 'Win' ? '0 0 8px rgba(76, 201, 240, 0.6)' : '0 0 8px rgba(239, 71, 111, 0.6)',
                                                    title: `Vs ${match.opponent} (${match.result})`
                                                }} />
                                            ))}
                                        </div>
                                    ) : <span style={{ opacity: 0.3 }}>-</span>}
                                </td>
                                <td style={{ fontWeight: '800', fontSize: '1.2rem', color: '#4cc9f0' }}>{user.xp} XP</td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                                    {users.length === 0 ? 'Loading leaderboard...' : 'No players match your search.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Leaderboard;
