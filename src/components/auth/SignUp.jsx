import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Auth.css";
import { authAPI } from "../../services/api";

export const SignUp = () => {
  // 初始化时从 localStorage 获取保存的表单数据
  const [formData, setFormData] = useState({
    name: "",
    email: localStorage.getItem('tempAuthEmail') || "",
    password: localStorage.getItem('tempAuthPassword') || "",
    confirmPassword: localStorage.getItem('tempAuthPassword') || ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    setLoading(true);
    
    try {
      await authAPI.register({
        username: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      // 注册成功后清除临时保存的数据
      localStorage.removeItem('tempAuthEmail');
      localStorage.removeItem('tempAuthPassword');
      
      // 设置注册成功标志
      localStorage.setItem('registrationSuccess', 'true');
      
      // 尝试自动登录
      await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      
      navigate('/todolist');
    } catch (err) {
      console.error('注册错误:', err);
      setLoading(false);
      
      if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('duplicate')) {
          setError('此用户名已被占用。请选择另一个用户名。');
        } else if (err.response.data.message.includes('password')) {
          setError('密码长度必须至少为6个字符，并包含字母和数字的组合。');
        } else {
          setError(err.response.data.message);
        }
      } else if (err.message === 'Network Error') {
        setError('无法连接到服务器。请检查您的网络连接。');
      } else {
        setError('暂时无法创建您的账户。请稍后再试。');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">创建账户</h1>
          <p className="auth-subtitle">请填写以下信息完成注册</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">姓名</label>
            <div className="form-input-container">
              <input
                id="name"
                type="text"
                name="name"
                className="form-input"
                placeholder="您的姓名"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
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
          
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">确认密码</label>
            <div className="form-input-container">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                className="form-input"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        
        <div className="auth-footer">
          已有账户？{" "}
          <Link to="/" className="auth-link">
            立即登录
          </Link>
        </div>
      </div>
    </div>
  );
}; 