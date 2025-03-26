// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";

import { Login } from './components/auth/Login';
import { SignUp } from './components/auth/SignUp';
import TodoList from './components/todo/TodoList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* 待办父路由 */}
        <Route path="/todolist" element={<TodoLayout />}>
          {/* 默认子路由：查看待办列表 */}
          <Route index element={<TodoList />} />
        </Route>
      </Routes>
    </Router>
  );
}

/**
 * 父层布局组件：可在这里做一些共同布局，比如标题栏等
 * <Outlet /> 负责渲染子路由对应的内容
 */
function TodoLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}

export default App;
