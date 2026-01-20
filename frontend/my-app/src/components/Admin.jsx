import React, { useState, useEffect } from 'react';

const Admin = () => {
    const [question, setQuestion] = useState({
        title: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        category: 'Technical',
        difficulty: 'Intermediate'
    });
    const [status, setStatus] = useState('');
    const [existingQuestions, setExistingQuestions] = useState([]);

    const fetchQuestions = async () => {
        try {
            // Fetch validation - grab Technical by default or all if we had an endpoint
            const res = await fetch('https://skillsduel-webservice.onrender.com/api/questions/Technical');
            const data = await res.json();
            if (Array.isArray(data)) setExistingQuestions(data);
        } catch (err) {
            console.error("Failed to fetch questions", err);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Adding...');

        try {
            const res = await fetch('https://skillsduel-webservice.onrender.com/api/questions/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(question)
            });

            if (res.ok) {
                setStatus('Question added successfully!');
                setQuestion({
                    title: '',
                    options: ['', '', '', ''],
                    correctAnswer: '',
                    category: 'Technical',
                    difficulty: 'Intermediate'
                });
                fetchQuestions();
            } else {
                setStatus('Failed to add question.');
            }
        } catch (err) {
            setStatus('Error connecting to server.');
        }
    };

    return (
        <div className="sd-page">
            <h1 className="sd-page-title">Admin Panel</h1>
            <div className="sd-card">
                <h2>Add New Question for Quiz API</h2>
                <form onSubmit={handleSubmit} className="sd-modal-form">
                    {status && <p className="sd-pill">{status}</p>}

                    <div className="sd-form-row">
                        <div className="sd-field">
                            <label>Category</label>
                            <select
                                value={question.category}
                                onChange={(e) => setQuestion({ ...question, category: e.target.value })}
                            >
                                <option>Technical</option>
                                <option>Aptitude</option>
                                <option>Logical Reasoning</option>
                            </select>
                        </div>
                        <div className="sd-field">
                            <label>Difficulty</label>
                            <select
                                value={question.difficulty}
                                onChange={(e) => setQuestion({ ...question, difficulty: e.target.value })}
                            >
                                <option>Beginner</option>
                                <option>Intermediate</option>
                                <option>Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div className="sd-field">
                        <label>Question Title</label>
                        <input
                            value={question.title}
                            onChange={(e) => setQuestion({ ...question, title: e.target.value })}
                            required
                            placeholder="e.g. What is the time complexity of QuickSort?"
                        />
                    </div>
                    {question.options.map((opt, idx) => (
                        <div key={idx} className="sd-field">
                            <label>Option {idx + 1}</label>
                            <input
                                value={opt}
                                onChange={(e) => {
                                    const newOps = [...question.options];
                                    newOps[idx] = e.target.value;
                                    setQuestion({ ...question, options: newOps });
                                }}
                                required
                            />
                        </div>
                    ))}
                    <div className="sd-field">
                        <label>Correct Answer (Must match one option exactly)</label>
                        <input
                            value={question.correctAnswer}
                            onChange={(e) => setQuestion({ ...question, correctAnswer: e.target.value })}
                            required
                        />
                    </div>
                    <button className="sd-btn sd-btn-primary">Add Question to DB</button>
                </form>
            </div>

            <div className="sd-card" style={{ marginTop: '2rem' }}>
                <h2>Existing Questions (Technical)</h2>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {existingQuestions.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No questions found. Add some above!</p>
                    ) : (
                        existingQuestions.map((q) => (
                            <div key={q._id} style={{
                                padding: '1rem',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                marginBottom: '0.5rem'
                            }}>
                                <h4 style={{ color: 'var(--text-primary)' }}>{q.title}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Ans: {q.correctAnswer} • {q.difficulty}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Admin;
