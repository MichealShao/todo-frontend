import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Auth.css";
import { authAPI } from "../../services/api";

export const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);
    
    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };
      
      await authAPI.register(registerData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <i className="fas fa-tasks logo-icon"></i>
          </div>
          <h1 className="auth-title">Task Manager</h1>
          <p className="auth-subtitle">Create an account to start organizing your tasks</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-container">
              <i className="fas fa-user input-icon"></i>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-container">
              <i className="fas fa-envelope input-icon"></i>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-container">
              <i className="fas fa-lock input-icon"></i>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                className="form-control"
              />
            </div>
            <small className="form-text text-muted">Must be at least 6 characters long</small>
          </div>
          
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-container">
              <i className="fas fa-lock input-icon"></i>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                className="form-control"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Creating Account...</> : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Log in</Link></p>
        </div>
      </div>

      <div className="auth-info">
        <p className="developer-credit">Developed by <span className="developer-name">Micheal Shao</span></p>
        <p className="copyright">&copy; {new Date().getFullYear()} Task Manager</p>
      </div>
    </div>
  );
}; 