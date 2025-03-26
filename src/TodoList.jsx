import React, { useState, useMemo, useRef } from "react";
import './TodoList.css';

/**
 * 这是一个带有：
 * 1. 查看待办（表格显示 + 支持排序）
 * 2. 新增待办（弹窗）
 * 3. 编辑待办（弹窗）
 * 4. 删除待办（倒计时确认）
 * 5. 查看详情（只读弹窗）
 * 6. 分页功能
 * 的单页面 TodoList 组件。
 *
 * 注意：此示例使用本地 state 保存 tasks，如需对接后端，请把新增/编辑/删除逻辑改成 axios 调用。
 * 另外，需要在 index.js 或 App.js 中引入 Tailwind 和 Font Awesome。
 */

function TodoList() {
  // 初始化更多示例任务，用于测试分页功能
  const generateSampleTasks = () => {
    const baseTasks = [
      {
        id: 1,
        priority: "High",
        deadline: "2025-03-28",
        hours: 6,
        details: "Complete the quarterly financial report and present to stakeholders",
      },
      {
        id: 2,
        priority: "Medium",
        deadline: "2025-04-02",
        hours: 4,
        details: "Update the product roadmap and align with development team",
      },
      {
        id: 3,
        priority: "Low",
        deadline: "2025-04-05",
        hours: 10,
        details: "Research and document new market opportunities in Asia Pacific region",
      },
    ];
    
    // 生成更多任务样本数据
    const additionalTasks = [];
    for (let i = 4; i <= 30; i++) {
      const priorityOptions = ["High", "Medium", "Low"];
      additionalTasks.push({
        id: i,
        priority: priorityOptions[Math.floor(Math.random() * 3)],
        deadline: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        hours: Math.floor(Math.random() * 20) + 1,
        details: `Task ${i} details: ${Math.random().toString(36).substring(2, 15)}`,
      });
    }
    
    return [...baseTasks, ...additionalTasks];
  };

  const [tasks, setTasks] = useState(generateSampleTasks);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  // 控制各种弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // 删除倒计时
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  // 计时器句柄，方便清除
  const deleteTimerRef = useRef(null);

  // 要删除的任务ID
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  // 查看详情的任务
  const [viewingTask, setViewingTask] = useState(null);

  // 排序字段 & 方向
  const [sortField, setSortField] = useState("priority");
  const [sortDirection, setSortDirection] = useState("desc"); // desc表示从高到低

  // 表单数据（新增或编辑任务共用）
  const [formData, setFormData] = useState({
    priority: "Medium",
    deadline: "",
    hours: "",
    details: "",
  });
  // 正在编辑的任务ID（null 表示目前不在编辑模式）
  const [editingTaskId, setEditingTaskId] = useState(null);

  // ---------------------------
  // 1. 任务列表的排序逻辑
  // ---------------------------
  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks; // 未指定排序字段时，按原数组顺序
    return [...tasks].sort((a, b) => {
      let compareA = a[sortField];
      let compareB = b[sortField];
      
      // 对priority字段特殊处理
      if (sortField === "priority") {
        // 设置优先级权重：High=3, Medium=2, Low=1
        const priorityWeight = {
          "High": 3,
          "Medium": 2,
          "Low": 1
        };
        compareA = priorityWeight[compareA];
        compareB = priorityWeight[compareB];
      } 
      // deadline字段需要转换成时间戳来比较
      else if (sortField === "deadline") {
        compareA = new Date(compareA).getTime();
        compareB = new Date(compareB).getTime();
      }
      
      if (compareA < compareB) return sortDirection === "asc" ? -1 : 1;
      if (compareA > compareB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection]);

  // 分页逻辑：计算当前页显示的任务
  const currentTasks = useMemo(() => {
    const indexOfLastTask = currentPage * tasksPerPage;
    const indexOfFirstTask = indexOfLastTask - tasksPerPage;
    return sortedTasks.slice(indexOfFirstTask, indexOfLastTask);
  }, [sortedTasks, currentPage, tasksPerPage]);

  // 总页数
  const totalPages = Math.ceil(sortedTasks.length / tasksPerPage);

  // ---------------------------
  // 2. 分页控制
  // ---------------------------
  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // ---------------------------
  // 3. 格式化日期
  // ---------------------------
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ---------------------------
  // 4. 切换排序
  // ---------------------------
  const sortBy = (field) => {
    if (sortField === field) {
      // 如果已经是这个字段，则循环切换：asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        // 第三次点击取消排序
        setSortField(null);
      }
    } else {
      // 新字段，从小到大排序
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ---------------------------
  // 5. 新增任务
  // ---------------------------
  const openAddModal = () => {
    // 初始化表单
    setFormData({
      priority: "Medium",
      deadline: "",
      hours: "",
      details: "",
    });
    setShowAddModal(true);
  };
  const closeAddModal = () => setShowAddModal(false);

  // ---------------------------
  // 6. 编辑任务
  // ---------------------------
  const editTask = (task) => {
    setFormData({ ...task }); // 将选中的任务数据填充进表单
    setEditingTaskId(task.id);
    setShowEditModal(true);
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTaskId(null);
  };

  // ---------------------------
  // 7. 查看任务详情
  // ---------------------------
  const viewTaskDetails = (task) => {
    setViewingTask(task);
    setShowViewModal(true);
  };
  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingTask(null);
  };

  // ---------------------------
  // 8. 删除任务
  // ---------------------------
  const deleteTask = (id) => {
    setDeleteTaskId(id);
    setShowDeleteModal(true);
    setDeleteCountdown(5);
    // 启动倒计时5秒
    clearInterval(deleteTimerRef.current);
    deleteTimerRef.current = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          // 倒计时结束 => 自动删除
          confirmDelete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const confirmDelete = () => {
    clearInterval(deleteTimerRef.current);
    setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
    setShowDeleteModal(false);
  };

  const cancelDelete = () => {
    clearInterval(deleteTimerRef.current);
    setShowDeleteModal(false);
    setDeleteTaskId(null);
  };

  // ---------------------------
  // 9. 提交表单（新增 or 编辑）
  // ---------------------------
  const handleSubmit = (e) => {
    e.preventDefault();
    if (showEditModal) {
      // 编辑模式
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTaskId ? { ...formData } : t))
      );
      closeEditModal();
    } else {
      // 新增模式
      const newId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
      const newTask = { ...formData, id: newId };
      setTasks((prev) => [...prev, newTask]);
      closeAddModal();
    }
  };

  // ---------------------------
  // 10. 统一关闭弹窗函数
  // ---------------------------
  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingTaskId(null);
    setFormData({
      priority: "Medium",
      deadline: "",
      hours: "",
      details: "",
    });
  };

  // 生成分页按钮数组
  const renderPaginationButtons = () => {
    const buttons = [];
    
    // 前一页按钮
    buttons.push(
      <button
        key="prev"
        onClick={() => paginate(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-button"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
    );
    
    // 页码按钮
    const maxPageButtons = 5; // 最多显示的页码按钮数量
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    // 第一页按钮 (如果有需要)
    if (startPage > 1) {
      buttons.push(
        <button
          key="1"
          onClick={() => paginate(1)}
          className="pagination-button"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="ellipsis1">...</span>);
      }
    }
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => paginate(i)}
          className={`pagination-button ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    
    // 最后一页按钮 (如果有需要)
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="ellipsis2">...</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => paginate(totalPages)}
          className="pagination-button"
        >
          {totalPages}
        </button>
      );
    }
    
    // 下一页按钮
    buttons.push(
      <button
        key="next"
        onClick={() => paginate(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-button"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    );
    
    return buttons;
  };

  // ---------------------------
  // 11. 渲染
  // ---------------------------
  return (
    <div className="todo-app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">Task Management</h1>
          <button
            onClick={openAddModal}
            className="add-button"
          >
            <i className="fas fa-plus text-sm"></i>
            Add New Task
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="task-table-container">
          <table className="task-table">
            <thead>
              <tr>
                <th>ID</th>
                <th className="sortable" onClick={() => sortBy("priority")}>
                  Priority 
                  <i className={`fas ${sortField === 'priority' 
                    ? (sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                    : 'fa-sort'}`} title={
                      sortField === 'priority' 
                        ? (sortDirection === 'asc' ? '点击降序排列' : '点击取消排序') 
                        : '点击升序排列'
                    }></i>
                </th>
                <th className="sortable" onClick={() => sortBy("deadline")}>
                  Deadline 
                  <i className={`fas ${sortField === 'deadline' 
                    ? (sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                    : 'fa-sort'}`} title={
                      sortField === 'deadline' 
                        ? (sortDirection === 'asc' ? '点击降序排列' : '点击取消排序') 
                        : '点击升序排列'
                    }></i>
                </th>
                <th>Est. Hours</th>
                <th>Details</th>
                <th style={{ textAlign: 'right', width: '240px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentTasks.map((task) => (
                <tr
                  key={task.id}
                  className={`task-row task-row-${task.priority.toLowerCase()}`}
                >
                  <td className="task-id">#{task.id}</td>
                  <td>
                    <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="task-deadline">{formatDate(task.deadline)}</td>
                  <td className="task-hours">{task.hours}h</td>
                  <td className="task-details">
                    {task.details.length > 40 
                      ? `${task.details.substring(0, 40)}...` 
                      : task.details}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => viewTaskDetails(task)}
                        className="action-button view-button"
                        title="查看详情"
                      >
                        <i className="fas fa-eye"></i> 查看
                      </button>
                      <button
                        onClick={() => editTask(task)}
                        className="action-button edit-button"
                        title="编辑任务"
                      >
                        <i className="fas fa-edit"></i> 编辑
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="action-button delete-button"
                        title="删除任务"
                      >
                        <i className="fas fa-trash"></i> 删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="pagination">
            {renderPaginationButtons()}
            <span className="pagination-info">
              第 {currentPage} 页 / 共 {totalPages} 页，总计 {tasks.length} 项
            </span>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">
              {showEditModal ? "Edit Task" : "Add New Task"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Priority <span className="required">*</span>
                </label>
                <div className="form-select-container">
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <i className="fas fa-chevron-down select-arrow"></i>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Deadline <span className="required">*</span>
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                  className="form-input"
                  style={{ boxSizing: 'border-box', width: '100%' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Estimated Hours <span className="required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: e.target.value })
                  }
                  min="1"
                  className="form-input"
                  style={{ boxSizing: 'border-box', width: '100%' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Details <span className="required">*</span>
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                  rows="3"
                  className="form-textarea"
                  style={{ boxSizing: 'border-box', width: '100%' }}
                  required
                />
              </div>
              <div className="form-buttons">
                <button
                  type="button"
                  onClick={closeModal}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {showEditModal ? "Save Changes" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Details Modal */}
      {showViewModal && viewingTask && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Task Details</h2>
              <button 
                className="modal-close" 
                onClick={closeViewModal}
              >
                ×
              </button>
            </div>
            <div className="detail-container">
              <div className="detail-label">ID:</div>
              <div className="detail-value">#{viewingTask.id}</div>
              
              <div className="detail-label">Priority:</div>
              <div className="detail-value">
                <span className={`priority-badge priority-${viewingTask.priority.toLowerCase()}`}>
                  {viewingTask.priority}
                </span>
              </div>
              
              <div className="detail-label">Deadline:</div>
              <div className="detail-value">{formatDate(viewingTask.deadline)}</div>
              
              <div className="detail-label">Estimated Hours:</div>
              <div className="detail-value">{viewingTask.hours}h</div>
              
              <div className="detail-label">Details:</div>
              <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                {viewingTask.details}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3 className="modal-title">Confirm Delete</h3>
            <p className="delete-modal-message">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </p>
            <div className="delete-countdown">
              Auto close in {deleteCountdown} seconds...
            </div>
            <div className="form-buttons">
              <button onClick={cancelDelete} className="cancel-button">
                Cancel
              </button>
              <button onClick={confirmDelete} className="delete-button-confirm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodoList;
