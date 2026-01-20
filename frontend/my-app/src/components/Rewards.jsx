import React from 'react';

const Rewards = () => {
    return (
        <div className="sd-page">
            <h1 className="sd-page-title">Your Rewards</h1>
            <div className="sd-feature-grid">
                <div className="sd-feature-card">
                    <h3>🏆 Quiz Master</h3>
                    <p>Win 10 quizzes in a row.</p>
                </div>
                <div className="sd-feature-card">
                    <h3>⚡ Fast Fingers</h3>
                    <p>Answer a question in under 2 seconds.</p>
                </div>
                <div className="sd-feature-card">
                    <h3>📚 Bookworm</h3>
                    <p>Complete 50 quizzes.</p>
                </div>
            </div>
        </div>
    );
}

export default Rewards;
