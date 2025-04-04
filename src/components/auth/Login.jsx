import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Auth.css";
import { authAPI } from "../../services/api";

export const Login = () => {
  const [formData, setFormData] = useState({
    email: localStorage.getItem('tempAuthEmail') || "",
    password: localStorage.getItem('tempAuthPassword') || "",
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('registrationSuccess');
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (name === 'email') {
      localStorage.setItem('tempAuthEmail', value);
    } else if (name === 'password') {
      localStorage.setItem('tempAuthPassword', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await authAPI.login({ email: formData.email, password: formData.password });
      
      localStorage.removeItem('tempAuthEmail');
      localStorage.removeItem('tempAuthPassword');
      
      navigate('/todolist');
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      
      if (err.response && err.response.status === 401) {
        setError('Username or password is incorrect. Please try again.');
      } else if (err.response && err.response.status === 400) {
        setError('Please enter a valid username and password.');
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError('Unable to log in at this time. Please try again later.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Login Account</h1>
          <p className="auth-subtitle">Please enter your login information</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <div className="form-input-container">
              <input
                id="email"
                type="email"
                name="email"
                className="form-input"
                placeholder="youremail@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="form-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          
          <div className="checkbox-container">
            <input
              id="remember"
              type="checkbox"
              name="rememberMe"
              className="checkbox-input"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <label htmlFor="remember">Remember me</label>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}; 