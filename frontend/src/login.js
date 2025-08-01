import React, { useState } from "react";
import axios from "axios";
import "./styles.css";

const API_BASE = process.env.REACT_APP_API_URL;

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: username.trim(),
        password: password
      });

      const { access_token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set axios default header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      onLogin(user);
      
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1>SFTP Admin Dashboard</h1>
          <p>Sign in to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-info">
            <strong>Demo Credentials:</strong><br />
            Admin: username: <code>admin</code>, password: <code>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login; 