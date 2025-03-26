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
      <div className="auth-form-container shadow rounded bg-white">
        <div className="text-center">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle text-muted">Login to your account</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="form-check">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="form-check-input"
              />
              <label htmlFor="remember" className="form-check-label">
                Remember me
              </label>
            </div>
            
            <button 
              type="button"
              className="btn btn-link text-decoration-none p-0"
              onClick={() => alert('Password reset feature not yet implemented')}
            >
              Forgot password?
            </button>
          </div>
          
          <button type="submit" className="btn btn-primary w-100 py-2">
            Login
          </button>
        </form>
        
        <div className="text-center mt-4">
          Don't have an account?{' '}
          <button
            type="button"
            className="btn btn-link text-decoration-none p-0"
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
