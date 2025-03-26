// src/Login.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // You can add actual login logic here, such as API calls
    console.log('Login information:', formData);
    
    // Simulate successful login, redirect to TodoList page
    navigate('/todolist');
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Login to your account</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          </div>
          
          <div className="remember-forgot">
            <div className="checkbox-group">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="form-checkbox"
              />
              <label htmlFor="remember" className="checkbox-label">
                Remember me
              </label>
            </div>
            
            <button 
              type="button"
              className="forgot-link"
              onClick={() => alert('Password reset feature not yet implemented')}
            >
              Forgot password?
            </button>
          </div>
          
          <button type="submit" className="auth-button">
            Login
          </button>
        </form>
        
        <div className="switch-text">
          Don't have an account?{' '}
          <button
            type="button"
            className="switch-link"
            onClick={() => navigate('/signup')}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
