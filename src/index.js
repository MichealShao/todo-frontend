import React from 'react';
import ReactDOM from 'react-dom/client';
// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// Import Bootstrap JS bundle
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// Import custom styles (after Bootstrap to allow overrides)
import './styles/index.css';
import './styles/Auth.css';
import './styles/common.css';
import './styles/TodoList.css';
import App from './App';

// 添加Font Awesome CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
link.integrity = 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==';
link.crossOrigin = 'anonymous';
link.referrerPolicy = 'no-referrer';
document.head.appendChild(link);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
