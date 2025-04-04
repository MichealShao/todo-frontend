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
        setError('用户名或密码不正确，请重试。');
      } else if (err.response && err.response.status === 400) {
        setError('请输入有效的用户名和密码。');
      } else if (err.message === 'Network Error') {
        setError('无法连接到服务器，请检查您的网络连接。');
      } else {
        setError('登录暂时无法完成，请稍后再试。');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">登录账户</h1>
          <p className="auth-subtitle">请输入您的登录信息</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">邮箱</label>
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
            <label className="form-label" htmlFor="password">密码</label>
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
                {showPassword ? "隐藏" : "显示"}
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
            <label htmlFor="remember">记住我</label>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        
        <div className="auth-footer">
          还没有账户？{" "}
          <Link to="/signup" className="auth-link">
            注册
          </Link>
        </div>
      </div>
    </div>
  );
}; 