import React from 'react';
import ReactDOM from 'react-dom/client';
// 导入Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// 导入Bootstrap JS bundle
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// 导入自定义样式（在Bootstrap之后导入，以便可以覆盖Bootstrap样式）
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
