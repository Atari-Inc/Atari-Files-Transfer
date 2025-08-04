import React, { useState } from "react";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const result = await onLogin(credentials);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-pattern"></div>
      </div>
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand">
              <div className="login-icon">🔐</div>
              <div className="login-brand-text">
                <h1>SecureTransfer</h1>
                <span>Enterprise SFTP Platform</span>
              </div>
            </div>
            <p className="login-subtitle">
              Sign in to access your secure file transfer workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={handleInputChange}
                className="form-input"
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleInputChange}
                className="form-input"
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm"></span>
                  Signing In...
                </>
              ) : (
                <>
                  <span>🔑</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="demo-credentials">
              <h4>Demo Credentials</h4>
              <div className="credential-item">
                <span className="credential-label">Admin Access:</span>
                <code>admin / admin123</code>
              </div>
              <div className="credential-item">
                <span className="credential-label">User Access:</span>
                <code>testuser / test123</code>
              </div>
            </div>
          </div>
        </div>
        
        <div className="login-features">
          <h3>Secure File Transfer Features</h3>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <div>
                <strong>End-to-End Encryption</strong>
                <p>Military-grade security for all file transfers</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div>
                <strong>High-Speed Transfers</strong>
                <p>Optimized for large file transfers and bulk operations</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <div>
                <strong>Team Collaboration</strong>
                <p>Secure shared folders and permission management</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <strong>Activity Monitoring</strong>
                <p>Comprehensive audit trails and real-time insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;