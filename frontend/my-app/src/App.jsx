import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Leaderboard from './components/Leaderboard';
import Rewards from './components/Rewards';
import Admin from './components/Admin';
import Game from './components/Game';
import './App.css'

import io from 'socket.io-client';

const socket = io('https://skillsduel-webservice.onrender.com');

function AppContent() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '' });

  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Quick Match State
  const [selectedCategory, setSelectedCategory] = useState('Technical');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate');
  const [stats, setStats] = useState({ activePlayers: 0, duelsToday: 0, avgDuelTime: 'N/A' });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Initial Fetch
    fetch('https://skillsduel-webservice.onrender.com/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to load stats", err));

    // Live Updates
    socket.on('global_stats_update', (data) => {
      // Optimistically update last duel, or just re-fetch all stats
      if (data.lastDuel) {
        setStats(prev => ({
          ...prev,
          lastDuel: data.lastDuel,
          duelsToday: prev.duelsToday + 1
        }));
      } else {
        // Fallback re-fetch
        fetch('https://skillsduel-webservice.onrender.com/api/stats')
          .then(res => res.json())
          .then(data => setStats(data));
      }
    });

    return () => {
      socket.off('global_stats_update');
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await fetch('https://skillsduel-webservice.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setShowLoginModal(false);
      setLoginData({ email: '', password: '' });
    } catch (err) {
      setLoginError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    setIsLoading(true);

    try {
      const response = await fetch('https://skillsduel-webservice.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data || 'Signup failed');
      }

      alert('Registration successful! Please log in.');
      setShowSignupModal(false);
      setShowLoginModal(true);
      setSignupData({ username: '', email: '', password: '' });
    } catch (err) {
      setSignupError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const isActive = (path) => {
    return location.pathname === path ? 'sd-nav-link sd-nav-link-active' : 'sd-nav-link';
  };

  return (
    <div className="sd-app">
      <header className="sd-header">
        <Link to="/" className="sd-logo">
          <span className="sd-logo-mark">SD</span>
          <span className="sd-logo-text">SkillDuels</span>
        </Link>

        <nav className="sd-nav">
          <Link to="/" className={isActive('/')}>Play</Link>
          <Link to="/leaderboard" className={isActive('/leaderboard')}>Leaderboard</Link>
          <Link to="/rewards" className={isActive('/rewards')}>Rewards</Link>
          <Link to="/admin" className={isActive('/admin')}>Admin</Link>
        </nav>

        <div className="sd-header-actions">
          {user ? (
            <>
              <span className="sd-user-info">Welcome, {user.username}</span>
              <button className="sd-btn sd-btn-ghost" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <button className="sd-btn sd-btn-ghost" onClick={() => setShowLoginModal(true)}>Log in</button>
              <button className="sd-btn sd-btn-primary" onClick={() => setShowSignupModal(true)}>Sign up</button>
            </>
          )}
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="sd-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h2>Log in</h2>
              <button className="sd-modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            </div>
            <form onSubmit={handleLogin} className="sd-modal-form">
              {loginError && <div className="sd-error-message">{loginError}</div>}
              <div className="sd-field">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="sd-field">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <button type="submit" className="sd-btn sd-btn-primary sd-btn-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="sd-modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h2>Sign up</h2>
              <button className="sd-modal-close" onClick={() => setShowSignupModal(false)}>×</button>
            </div>
            <form onSubmit={handleSignup} className="sd-modal-form">
              {signupError && <div className="sd-error-message">{signupError}</div>}
              <div className="sd-field">
                <label htmlFor="signup-username">Username</label>
                <input
                  type="text"
                  id="signup-username"
                  value={signupData.username}
                  onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="sd-field">
                <label htmlFor="signup-email">Email</label>
                <input
                  type="email"
                  id="signup-email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="sd-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  type="password"
                  id="signup-password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <button type="submit" className="sd-btn sd-btn-primary sd-btn-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={
          <main className="sd-main">
            <section className="sd-hero">
              <div className="sd-hero-left">
                <p className="sd-pill">EDU-WEB-2026-115 • Competitive Learning</p>
                <h1 className="sd-hero-title">
                  Battle your friends.
                  <span> Level up your skills.</span>
                </h1>
                <p className="sd-hero-subtitle">
                  Head-to-head quiz duels across technical, aptitude, and logical categories.
                  Earn XP, climb leaderboards, and unlock badges as you play.
                </p>

                <div className="sd-hero-actions">
                  <button
                    className="sd-btn sd-btn-primary sd-btn-lg"
                    onClick={() => {
                      if (user) navigate('/game?category=Technical');
                      else setShowLoginModal(true);
                    }}
                  >
                    Start a 1v1 Duel
                  </button>
                  <button className="sd-btn sd-btn-outline sd-btn-lg" onClick={() => navigate('/game?category=LiveRoom')}>Join a Live Room</button>
                </div>

                <div className="sd-hero-meta">
                  <div className="sd-meta-item">
                    <span className="sd-meta-label">Active players</span>
                    <span className="sd-meta-value">{stats.activePlayers}</span>
                  </div>
                  <div className="sd-meta-item">
                    <span className="sd-meta-label">Duels today</span>
                    <span className="sd-meta-value">{stats.duelsToday}</span>
                  </div>
                  <div className="sd-meta-item">
                    <span className="sd-meta-label">Avg. duel time</span>
                    <span className="sd-meta-value">{stats.avgDuelTime}</span>
                  </div>
                </div>
              </div>

              <div className="sd-hero-right">
                <div className="sd-duel-card">
                  <div className="sd-duel-header">
                    <span className="sd-badge sd-badge-live">
                      {user && user.matchHistory && user.matchHistory.length > 0 ? 'YOUR LAST DUEL' : 'RECENT DUEL'}
                    </span>
                    <span className="sd-duel-timer">
                      {user && user.matchHistory && user.matchHistory.length > 0
                        ? new Date(user.matchHistory[user.matchHistory.length - 1].date).toLocaleDateString()
                        : (stats.lastDuel ? new Date(stats.lastDuel.endedAt).toLocaleDateString() : 'N/A')}
                    </span>
                  </div>

                  {(() => {
                    // Determine who to show
                    // Case A: User Logged In & Has History
                    if (user && user.matchHistory && user.matchHistory.length > 0) {
                      const lastMatch = user.matchHistory[user.matchHistory.length - 1];
                      const isWin = lastMatch.result === 'Win';
                      return (
                        <>
                          <div className="sd-duel-players">
                            <div className="sd-player">
                              <div className="sd-avatar sd-avatar-left" style={{ borderColor: isWin ? '#4cc9f0' : '#ef476f' }}>
                                {user.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="sd-player-name">{user.username}</p>
                                <p className="sd-player-meta">{lastMatch.result}</p>
                              </div>
                            </div>
                            <div className="sd-vs-pill">VS</div>
                            <div className="sd-player sd-player-right">
                              <div className="sd-avatar sd-avatar-right">{lastMatch.opponent ? lastMatch.opponent[0].toUpperCase() : '?'}</div>
                              <div>
                                <p className="sd-player-name">{lastMatch.opponent}</p>
                                <p className="sd-player-meta">Opponent</p>
                              </div>
                            </div>
                          </div>
                          <div className="sd-duel-footer">
                            <div className="sd-footer-item">
                              <span className="sd-footer-label">XP Earned</span>
                              <span className="sd-footer-value">+{lastMatch.xpEarned} XP</span>
                            </div>
                          </div>
                        </>
                      );
                    }

                    // Case B: Global Recent Duel
                    if (stats.lastDuel && stats.lastDuel.players && stats.lastDuel.players.length === 2) {
                      return (
                        <>
                          <div className="sd-duel-players">
                            <div className="sd-player">
                              <div className="sd-avatar sd-avatar-left">{stats.lastDuel.players[0].username[0].toUpperCase()}</div>
                              <div>
                                <p className="sd-player-name">{stats.lastDuel.players[0].username}</p>
                                <p className="sd-player-meta">Player 1</p>
                              </div>
                            </div>
                            <div className="sd-vs-pill">VS</div>
                            <div className="sd-player sd-player-right">
                              <div className="sd-avatar sd-avatar-right">{stats.lastDuel.players[1].username[0].toUpperCase()}</div>
                              <div>
                                <p className="sd-player-name">{stats.lastDuel.players[1].username}</p>
                                <p className="sd-player-meta">Player 2</p>
                              </div>
                            </div>
                          </div>
                          <div className="sd-duel-footer">
                            <div className="sd-footer-item">
                              <span className="sd-footer-label">Category</span>
                              <span className="sd-footer-value">{stats.lastDuel.category}</span>
                            </div>
                          </div>
                        </>
                      );
                    }

                    // Case C: Fallback / Initial State
                    return (
                      <>
                        <div className="sd-duel-players">
                          <div className="sd-player">
                            <div className="sd-avatar sd-avatar-left">?</div>
                            <div><p className="sd-player-name">Waiting...</p></div>
                          </div>
                          <div className="sd-vs-pill">VS</div>
                          <div className="sd-player sd-player-right">
                            <div className="sd-avatar sd-avatar-right">?</div>
                            <div><p className="sd-player-name">Waiting...</p></div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', opacity: 0.7, padding: '1rem' }}>No recent duels found</div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>

            <section className="sd-section sd-section-grid">
              <div className="sd-card sd-card-primary">
                <h2>Quick join a duel</h2>
                <p>Select a skill track and we&apos;ll match you with a player of similar rank.</p>
                <div className="sd-form-row">
                  <div className="sd-field">
                    <label>Skill area</label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      <option value="Technical">Technical</option>
                      <option value="Aptitude">Aptitude</option>
                      <option value="Logical Reasoning">Logical Reasoning</option>
                    </select>
                  </div>
                  <div className="sd-field">
                    <label>Difficulty</label>
                    <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <button
                  className="sd-btn sd-btn-primary sd-btn-full"
                  onClick={() => {
                    if (user) navigate(`/game?category=${selectedCategory}&difficulty=${selectedDifficulty}`);
                    else setShowLoginModal(true);
                  }}
                >
                  Find me an opponent
                </button>
              </div>

              <div className="sd-card sd-card-glass">
                <h2>Your weekly snapshot</h2>
                <div className="sd-stats-grid">
                  <div className="sd-stat">
                    <span className="sd-stat-label">XP earned</span>
                    <span className="sd-stat-value">
                      {user && user.matchHistory
                        ? user.matchHistory.reduce((acc, curr) => acc + (curr.xpEarned || 0), 0)
                        : 0}
                    </span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Win rate</span>
                    <span className="sd-stat-value">
                      {user && user.matchHistory && user.matchHistory.length > 0
                        ? Math.round((user.matchHistory.filter(m => m.result === 'Win').length / user.matchHistory.length) * 100) + '%'
                        : '0%'}
                    </span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Total Matches</span>
                    <span className="sd-stat-value">
                      {user && user.matchHistory ? user.matchHistory.length : 0}
                    </span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Badges</span>
                    <span className="sd-stat-value">
                      {user && user.badges ? user.badges.length : 0} unlocked
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="sd-section">
              <div className="sd-section-header">
                <h2>Built for serious, fun learning</h2>
                <p>
                  SkillDuels combines competitive gameplay with structured progression so students
                  stay motivated while mastering concepts.
                </p>
              </div>
              <div className="sd-feature-grid">
                <div className="sd-feature-card">
                  <h3>1v1 quiz battles</h3>
                  <p>
                    Real-time head-to-head quizzes with timers, streaks, and instant feedback to
                    keep every question exciting.
                  </p>
                </div>
                <div className="sd-feature-card">
                  <h3>Dynamic leaderboards</h3>
                  <p>
                    Global and weekly rankings with XP multipliers for consistency, so effort is
                    always rewarded.
                  </p>
                </div>
                <div className="sd-feature-card">
                  <h3>Admin-powered content</h3>
                  <p>
                    Curated categories and question banks managed via an admin panel for clean,
                    fair competitions.
                  </p>
                </div>
              </div>
            </section>
          </main>
        } />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/game" element={<Game />} />
      </Routes>

      <footer className="sd-footer">
        <span>SkillDuels • Competitive Learning Platform</span>
        <span>Prototype • MERN + Socket.IO</span>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App
