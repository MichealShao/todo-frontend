import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../../styles/TodoList.css';
import { tasksAPI, authAPI } from "../../services/api";

/**
 * This is a TodoList component with:
 * 1. View tasks (table display + sorting support)
 * 2. Add task (modal)
 * 3. Edit task (modal)
 * 4. Delete task (countdown confirmation)
 * 5. View details (read-only modal)
 * 6. Pagination functionality
 *
 * Note: This example uses local state to store tasks. If connecting to a backend,
 * please change the add/edit/delete logic to axios calls.
 * Also, Font Awesome needs to be imported in index.js or App.js.
 */

/**
 * TodoList Component
 * Features:
 * - Task listing with sorting and filtering
 * - Task creation and editing
 * - Task status management
 * - Calendar view for due dates
 * - Pagination
 */

// Calendar view component
const CalendarView = ({ datesWithDeadlines, onSelectDate, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get the day of the week for the first day of the month (0-6, 0 is Sunday)
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  // Get the number of days in the current month
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  
  // Generate calendar grid
  const generateCalendarDays = () => {
    const days = [];
    // Fill in dates from previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Fill in dates for current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      days.push(date);
    }
    
    return days;
  };
  
  // Handle month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Check if date has deadline tasks
  const hasDeadlines = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return !!datesWithDeadlines[dateStr];
  };
  
  // Check if date is today
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };
  
  // Check if date is selected
  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };
  
  // Get task count for a date
  const getTaskCount = (date) => {
    if (!date) return 0;
    const dateStr = date.toISOString().split('T')[0];
    return datesWithDeadlines[dateStr]?.length || 0;
  };
  
  // Get full month name
  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  // Weekday names
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <button onClick={prevMonth} className="month-nav-button">
          <i className="fas fa-chevron-left"></i>
        </button>
        <h3 className="current-month">{monthName}</h3>
        <button onClick={nextMonth} className="month-nav-button">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      <div className="calendar-grid">
        {/* Weekday headers */}
        {weekdays.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        
        {/* Date cells */}
        {generateCalendarDays().map((date, index) => (
          <div 
            key={index} 
            className={`calendar-day ${!date ? 'empty-day' : ''} ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
            onClick={date ? () => onSelectDate(date) : null}
          >
            {date && (
              <>
                <span className="day-number">{date.getDate()}</span>
                {hasDeadlines(date) && (
                  <span className="deadline-dot" title={`${getTaskCount(date)} tasks`}>
                    {getTaskCount(date)}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Task status constants
const TASK_STATUS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  EXPIRED: 'Expired'
};

// Map frontend status to API status
const mapStatusToApi = (status) => {
  switch (status) {
    case TASK_STATUS.TODO:
      return 'Pending';
    case TASK_STATUS.IN_PROGRESS:
      return 'In Progress';
    case TASK_STATUS.DONE:
      return 'Completed';
    case TASK_STATUS.EXPIRED:
      return 'Expired';
    default:
      return status;
  }
};

// API 状态映射到显示状态
const mapApiToStatus = (apiStatus) => {
  console.log('Mapping API status:', apiStatus); // 添加调试日志
  switch (apiStatus) {
    case 'Pending':
      return TASK_STATUS.TODO;
    case 'In Progress':
      return TASK_STATUS.IN_PROGRESS;
    case 'Completed':
      return TASK_STATUS.DONE;
    case 'Expired':
      return TASK_STATUS.EXPIRED;
    default:
      // 如果是前端状态值，直接返回
      if (Object.values(TASK_STATUS).includes(apiStatus)) {
        return apiStatus;
      }
      console.warn('Unknown status:', apiStatus);
      return apiStatus;
  }
};

function TodoList() {
  const navigate = useNavigate();

  // Handle logout
  const handleLogout = () => {
    authAPI.logout();
    navigate('/');
  };

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  }); // Filter state

  // 添加防止重复操作的状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [disabledButtons, setDisabledButtons] = useState({});

  // Calendar related states
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Pagination related states
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [sortOptions, setSortOptions] = useState({
    sortField: 'displayId',
    sortDirection: 'desc'
  });

  // Control various modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Task ID to delete
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  // Task being viewed
  const [viewingTask, setViewingTask] = useState(null);

  // Form data (shared for add/edit task)
  const [formData, setFormData] = useState({
    priority: "Medium",
    deadline: "",
    hours: "",
    details: "",
    status: "Pending",
    startTime: ""
  });
  // Currently editing task ID (null means not in edit mode)
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Fetch tasks when component loads
  useEffect(() => {
    fetchTasks();
  }, [pagination.page, sortOptions.sortField, sortOptions.sortDirection]);

  // Fetch task data from API
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tasksAPI.getAllTasks();
      console.log('Fetched task data:', response);
      
      // 转换 API 返回的状态为显示状态，使用 _id 作为任务 ID
      const tasksWithDisplayStatus = response.tasks.map(task => ({
        ...task,
        status: mapApiToStatus(task.status)
        // 不再设置 displayId
      }));
      
      setTasks(tasksWithDisplayStatus);
      
      // Update pagination info
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err.response?.data || err.message || err);
      setError('Unable to load tasks. Please refresh the page or try again later.');
      if (err.response && err.response.status === 401) {
        // If unauthorized error, redirect to login page
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // 2. Pagination control
  // ---------------------------
  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= pagination.pages) {
      setPagination(prev => ({
        ...prev,
        page: pageNumber
      }));
    }
  };

  // ---------------------------
  // 3. Format date
  // ---------------------------
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    
    try {
      const date = new Date(dateStr);
      return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateStr;
    }
  };

  // ---------------------------
  // 4. Sort switch
  // ---------------------------
  const sortBy = (field) => {
    setSortOptions({
      sortField: field,
      sortDirection: sortOptions.sortField === field && sortOptions.sortDirection === "asc" ? "desc" : "asc"
    });
    console.log(`Sorting by ${field}, direction: ${sortOptions.sortField === field && sortOptions.sortDirection === "asc" ? "desc" : "asc"}`);
  };

  // Reset sorting and filtering
  const resetFilters = () => {
    setSortOptions({
      sortField: 'displayId',
      sortDirection: 'desc'
    });
    setSearchQuery('');
    setFilters({
      status: '',
      priority: ''
    });
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle filter condition change
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Prevent duplicate operations
  const debounceOperation = (operationId, callback, delay = 1000) => {
    if (disabledButtons[operationId]) {
      return; // If button is disabled, return immediately
    }
    
    // Set button to disabled state
    setDisabledButtons(prev => ({ ...prev, [operationId]: true }));
    
    // Execute callback
    callback();
    
    // Enable button after delay
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [operationId]: false }));
    }, delay);
  };

  // Get today's date in local timezone
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Ensure date string is not affected by timezone - maintain YYYY-MM-DD format
  const normalizeDateString = (dateStr) => {
    if (!dateStr) return "";
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // For dates from backend, handle UTC timezone issue
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ---------------------------
  // 5. Add new task
  // ---------------------------
  const openAddModal = () => {
    debounceOperation('addTask', () => {
      // 使用本地日期格式
      const todayDateStr = getTodayDateString();
      
      // Initialize form - status fixed as Pending for new tasks
      setFormData({
        priority: "Medium",
        deadline: todayDateStr, // 设置默认值为今天
        hours: "",
        details: "",
        status: "Pending", // Fixed as Pending for new tasks
        startTime: ""
      });
      setShowAddModal(true);
    });
  };
  const closeAddModal = () => setShowAddModal(false);

  // ---------------------------
  // 6. Edit task
  // ---------------------------
  const editTask = (task) => {
    const taskId = task.id || task._id;
    debounceOperation(`editTask-${taskId}`, () => {
      // 规范化处理日期，确保与后端一致
      const formattedDeadline = task.deadline ? normalizeDateString(task.deadline) : '';
      const formattedStartTime = task.startTime ? normalizeDateString(task.startTime) : '';
        
      console.log('Editing task, current status:', task.status);
      console.log('Editing task ID:', taskId);
        
      if (!taskId) {
        console.error('Task missing ID field:', task);
        setError('Task ID is missing. Please refresh the page and try again.');
        return;
      }
        
      // 初始化表单
      setFormData({
        priority: task.priority || 'Medium',
        deadline: formattedDeadline,
        hours: task.hours || '',
        details: task.details || '',
        status: task.status || 'Pending',
        startTime: formattedStartTime || ''
      });
        
      setEditingTaskId(taskId);
      setShowEditModal(true);
    });
  };
  
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTaskId(null);
  };

  // ---------------------------
  // 7. View task details
  // ---------------------------
  const viewTaskDetails = (task) => {
    const taskId = task.id || task._id;
    debounceOperation(`viewTask-${taskId}`, () => {
      setViewingTask(task);
      setShowViewModal(true);
    });
  };
  
  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingTask(null);
  };

  // ---------------------------
  // 8. Delete task
  // ---------------------------
  const deleteTask = (id) => {
    debounceOperation(`deleteTask-${id}`, () => {
      // Ensure valid ID
      if (!id) {
        console.error('Attempted to delete task but ID is missing');
        setError('Unable to delete task: Task ID is missing');
        return;
      }
      
      console.log('Preparing to delete task ID:', id);
      setDeleteTaskId(id);
      setShowDeleteModal(true);
    });
  };

  const confirmDelete = async () => {
    if (isProcessing) return; // 如果正在处理中，直接返回
    
    setIsProcessing(true);
    console.log('Preparing to delete task ID:', deleteTaskId);
    
    try {
      await tasksAPI.deleteTask(deleteTaskId);
      
      // Remove task from local state
      setTasks((prev) => prev.filter((t) => {
        const taskId = t.id || t._id;
        return taskId !== deleteTaskId;
      }));
      
      setError(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    } finally {
      setShowDeleteModal(false);
      setDeleteTaskId(null);
      setTimeout(() => setIsProcessing(false), 500); // 延迟恢复状态
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTaskId(null);
  };

  // ---------------------------
  // 9. Submit form (Add or Edit)
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Validate form data
      if (!formData.details || formData.details.trim() === '') {
        setError('Please provide a description for the task.');
        setIsProcessing(false);
        return;
      }

      // Validate start date for In Progress and Done status
      if ((formData.status === 'In Progress' || formData.status === 'Completed') && !formData.startTime) {
        setError('Start date is required for tasks that are In Progress or Done.');
        setIsProcessing(false);
        return;
      }

      // Validate due date is after start date
      if (formData.startTime && formData.deadline && formData.deadline < formData.startTime) {
        setError('Due date must be after the start date.');
        setIsProcessing(false);
        return;
      }

      if (showEditModal) {
        // Edit mode
        if (!editingTaskId) {
          setError('Task ID is missing. Please refresh the page and try again.');
          setIsProcessing(false);
          return;
        }
        
        const updatedTask = await tasksAPI.updateTask(editingTaskId, formData);
        
        setTasks((prev) => {
          return prev.map((t) => {
            const taskId = t._id || t.id;
            if (taskId === editingTaskId) {
              return {
                ...updatedTask
              };
            }
            return t;
          });
        });
        
        closeEditModal();
      } else {
        // Add mode
        try {
          const taskData = {
            priority: formData.priority || 'Medium',
            deadline: formData.deadline,
            hours: parseInt(formData.hours, 10) || 1,
            status: mapStatusToApi(formData.status),
            details: formData.details.trim(),
            startTime: formData.startTime || null
          };
          
          const newTask = await tasksAPI.createTask(taskData);
          
          // 直接使用后端返回的任务
          setTasks((prev) => [...prev, newTask]);
          
          closeAddModal();
        } catch (err) {
          console.error('Task creation failed:', err);
          if (err.response?.status === 500) {
            setError('Server error occurred. Please try again later.');
          } else {
            setError('Unable to create the task. Please try again.');
          }
        }
      }
    } catch (err) {
      console.error('Task operation failed:', err);
      setError(showEditModal ? 
        'Unable to update the task. Please try again.' : 
        'Unable to create the task. Please try again.');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  // ---------------------------
  // 10. Unified modal close function
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
      status: "Pending",
      startTime: ""
    });
  };

  // Generate pagination button array
  const renderPaginationButtons = () => {
    const buttons = [];
    
    // Previous page button
    buttons.push(
      <button
        key="prev"
        onClick={() => paginate(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="pagination-button"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
    );
    
    // Page number buttons
    const maxPageButtons = 5; // Maximum number of page number buttons to display
    let startPage = Math.max(1, pagination.page - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(pagination.pages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    // First page button (if needed)
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
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => paginate(i)}
          className={`pagination-button ${pagination.page === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    
    // Last page button (if needed)
    if (endPage < pagination.pages) {
      if (endPage < pagination.pages - 1) {
        buttons.push(<span key="ellipsis2">...</span>);
      }
      buttons.push(
        <button
          key={pagination.pages}
          onClick={() => paginate(pagination.pages)}
          className="pagination-button"
        >
          {pagination.pages}
        </button>
      );
    }
    
    // Next page button
    buttons.push(
      <button
        key="next"
        onClick={() => paginate(pagination.page + 1)}
        disabled={pagination.page === pagination.pages}
        className="pagination-button"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    );
    
    return buttons;
  };

  // Sort and filter tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    // Get today's date string for comparison
    const todayStr = getTodayDateString();
    
    // First apply filters
    let result = [...tasks];
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.details.toLowerCase().includes(query) || 
        (task.displayId && task.displayId.includes(query))
      );
    }
    
    // Filter by status
    if (filters.status !== '') {
      console.log('Filtering by status:', filters.status); // 添加调试日志
      result = result.filter(task => {
        const taskStatus = mapApiToStatus(task.status);
        console.log('Task status:', task.status, 'Mapped status:', taskStatus, 'Filter value:', filters.status);
        return taskStatus === filters.status;
      });
    }
    
    // Filter by priority
    if (filters.priority !== '') {
      result = result.filter(task => task.priority === filters.priority);
    }
    
    // Then update status if expired
    result = result.map(task => {
      const taskCopy = {...task};
      
      // Check if task is expired
      if (task.status !== 'Completed') {
        if (task.deadline && task.deadline < todayStr) {
          taskCopy.status = 'Expired';
        }
      }
      
      return taskCopy;
    });
    
    // Then sort
    return result.sort((a, b) => {
      // First separate active and inactive tasks
      const aIsInactive = a.status === 'Completed' || a.status === 'Expired';
      const bIsInactive = b.status === 'Completed' || b.status === 'Expired';
      
      // Inactive tasks below active ones
      if (aIsInactive && !bIsInactive) return 1;
      if (!aIsInactive && bIsInactive) return -1;
      
      // If both are active or both are inactive, apply the selected sorting
      // Use numerical comparison for numeric fields
      if (sortOptions.sortField === 'hours') {
        const aHours = parseInt(a.hours || 0);
        const bHours = parseInt(b.hours || 0);
        return sortOptions.sortDirection === 'asc' ? aHours - bHours : bHours - aHours;
      } 
      // Use special comparison for displayId to ensure numerical order
      else if (sortOptions.sortField === 'displayId') {
        const aId = a._id || a.id || '';
        const bId = b._id || b.id || '';
        return sortOptions.sortDirection === 'asc' 
          ? aId.localeCompare(bId) 
          : bId.localeCompare(aId);
      }
      // Use date comparison for date fields
      else if (sortOptions.sortField === 'deadline' || sortOptions.sortField === 'startTime') {
        const aDate = a[sortOptions.sortField] || '';
        const bDate = b[sortOptions.sortField] || '';
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return sortOptions.sortDirection === 'asc' 
          ? aDate.localeCompare(bDate) 
          : bDate.localeCompare(aDate);
      }
      // Use string comparison for other fields
      else {
        const aValue = a[sortOptions.sortField] || '';
        const bValue = b[sortOptions.sortField] || '';
        return sortOptions.sortDirection === 'asc' 
          ? aValue.toString().localeCompare(bValue.toString()) 
          : bValue.toString().localeCompare(aValue.toString());
      }
    });
  }, [tasks, sortOptions.sortField, sortOptions.sortDirection, searchQuery, filters.status, filters.priority]);

  // Calculate today's todo count after filteredAndSortedTasks memo
  const todayTodoCount = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Filter tasks due today that are not completed/expired
    return tasks.filter(task => {
      const deadlineDate = task.deadline?.split('T')[0];
      return deadlineDate === today && task.status !== 'Completed' && task.status !== 'Expired';
    }).length;
  }, [tasks]);

  // Calculate which dates have deadline tasks
  const datesWithDeadlines = useMemo(() => {
    if (!tasks || tasks.length === 0) return {};
    
    const dates = {};
    tasks.forEach(task => {
      if (task.deadline) {
        // Ensure consistent date format YYYY-MM-DD
        const deadlineDate = task.deadline.split('T')[0];
        if (!dates[deadlineDate]) {
          dates[deadlineDate] = [];
        }
        dates[deadlineDate].push(task);
      }
    });
    
    return dates;
  }, [tasks]);

  // Filter tasks by selected date
  const tasksBySelectedDate = useMemo(() => {
    if (!selectedDate || !tasks || tasks.length === 0) return filteredAndSortedTasks;
    
    // Convert selected date to yyyy-mm-dd format for comparison
    const formattedSelectedDate = selectedDate.toISOString().split('T')[0];
    
    return filteredAndSortedTasks.filter(task => {
      const taskDeadline = task.deadline?.split('T')[0];
      return taskDeadline === formattedSelectedDate;
    });
  }, [selectedDate, filteredAndSortedTasks, tasks]);

  // Handle calendar button click
  const toggleCalendar = () => {
    setShowCalendar(prev => !prev);
    if (showCalendar) {
      // Clear date selection when closing calendar
      setSelectedDate(null);
    }
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // Close calendar and reset filters
  const closeCalendarAndReset = () => {
    setShowCalendar(false);
    setSelectedDate(null);
  };

  // ---------------------------
  // 11. Render
  // ---------------------------
  return (
    <div className="todo-app">
      {/* Header with responsive design */}
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">Task Management</h1>
          <div className="header-actions">
            <div className="stat-item">
              <i className="fas fa-calendar-day stat-icon"></i>
              <div className="stat-content">
                <span className="stat-label">Tasks for Today</span>
                <span className="stat-value">{todayTodoCount}</span>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="btn btn-success d-flex align-items-center gap-2"
              disabled={disabledButtons['addTask']}
            >
              <i className="fas fa-plus"></i>
              <span className="d-none d-sm-inline">New Task</span>
              <span className="d-inline d-sm-none">New</span>
            </button>
            <button
              onClick={handleLogout}
              className="logout-button"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span className="d-none d-sm-inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Search and filter with responsive layout */}
        <div className="search-filter-bar">
          <div className="search-controls">
            <div className="controls-group search-control-row">
              <div className="search-input-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search in tasks..."
                  className="search-input"
                />
                <i className="fas fa-search search-icon"></i>
              </div>
            </div>
            
            <div className="controls-group filter-group">
              <button 
                onClick={toggleCalendar} 
                className={`calendar-button ${showCalendar ? 'active' : ''}`}
              >
                <i className="fas fa-calendar-alt"></i>
                <span className="d-none d-md-inline">Calendar View</span>
              </button>
              
              <div className="filter-select-container">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Expired">Expired</option>
                </select>
                <i className="fas fa-filter filter-icon"></i>
              </div>
              
              <div className="filter-select-container">
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <i className="fas fa-filter filter-icon"></i>
              </div>
              
              <button 
                onClick={resetFilters}
                className="reset-button"
                title="Clear all filters and sorting"
              >
                <i className="fas fa-undo-alt"></i>
                <span className="d-none d-md-inline">Clear Filters</span>
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {/* Calendar view and task table are mutually exclusive */}
        {showCalendar ? (
          <div className="calendar-container-wrapper">
            <div className="calendar-header">
              <h3>Task Calendar</h3>
              <button className="close-calendar" onClick={closeCalendarAndReset}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="calendar-body">
              <CalendarView 
                datesWithDeadlines={datesWithDeadlines} 
                onSelectDate={handleDateSelect}
                selectedDate={selectedDate}
              />
            </div>
            
            {selectedDate && (
              <div className="selected-date-tasks">
                <h4>
                  Tasks for {selectedDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </h4>
                {tasksBySelectedDate.length === 0 ? (
                  <p className="no-tasks">No tasks scheduled for this date</p>
                ) : (
                  <ul className="date-tasks-list">
                    {tasksBySelectedDate.map(task => (
                      <li key={task._id || task.id} className="date-task-item" data-priority={task.priority.toLowerCase()}>
                        <div className="date-task-details">
                          <span className="date-task-title">{task.details}</span>
                          <div className="date-task-badges">
                            <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                              {task.priority}
                            </span>
                            <span className={`status-badge status-${(task.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                              {task.status || 'Pending'}
                            </span>
                            <span className="task-hours">
                              <i className="fas fa-clock" style={{marginRight: '4px'}}></i>
                              {task.hours} hours
                            </span>
                          </div>
                        </div>
                        <div className="date-task-actions d-flex align-items-center">
                          <button onClick={() => viewTaskDetails(task)} className="date-task-button" title="View details" disabled={disabledButtons[`viewTask-${task.id || task._id}`]}>
                            <i className="fas fa-eye"></i>
                          </button>
                          <button onClick={() => editTask(task)} className="date-task-button" title="Edit task" disabled={disabledButtons[`editTask-${task.id || task._id}`]}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => deleteTask(task.id || task._id)} className="date-task-button" title="Delete task" disabled={disabledButtons[`deleteTask-${task.id || task._id}`]}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <div className="task-table-container">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>No tasks yet. Click "New Task" to get started.</p>
              </div>
            ) : (
              <div className="card shadow-sm mb-4">
                <div className="card-body overflow-auto">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr className="text-center fs-6">
                        <th className="text-center">
                          ID
                        </th>
                        <th className="text-center">
                          Priority
                        </th>
                        <th className="text-center">
                          Status
                        </th>
                        <th 
                          className="sortable text-center" 
                          onClick={() => sortBy('deadline')}
                          style={{ cursor: 'pointer' }}
                        >
                          Due Date
                          <i className={`ms-2 fas ${
                            sortOptions.sortField === 'deadline' 
                              ? `fa-sort-${sortOptions.sortDirection === 'asc' ? 'down' : 'up'} text-primary` 
                              : 'fa-sort text-secondary'
                          }`}></i>
                        </th>
                        <th 
                          className="sortable text-center" 
                          onClick={() => sortBy('startTime')}
                          style={{ cursor: 'pointer' }}
                        >
                          Started
                          <i className={`ms-2 fas ${
                            sortOptions.sortField === 'startTime' 
                              ? `fa-sort-${sortOptions.sortDirection === 'asc' ? 'down' : 'up'} text-primary` 
                              : 'fa-sort text-secondary'
                          }`}></i>
                        </th>
                        <th 
                          className="sortable text-center" 
                          onClick={() => sortBy('hours')}
                          style={{ cursor: 'pointer' }}
                        >
                          Time Est.
                          <i className={`ms-2 fas ${
                            sortOptions.sortField === 'hours' 
                              ? `fa-sort-${sortOptions.sortDirection === 'asc' ? 'down' : 'up'} text-primary` 
                              : 'fa-sort text-secondary'
                          }`}></i>
                        </th>
                        <th className="text-center">
                          Description
                        </th>
                        <th className="actions-header text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedTasks.map((task) => {
                        const isInactive = task.status === 'Completed' || task.status === 'Expired';
                        // 获取任务的 ID（可能是 _id 或 id，取决于后端返回）
                        const taskId = task._id || task.id;
                        
                        return (
                          <tr
                            key={taskId}
                            className={`task-row task-row-${task.priority.toLowerCase()} ${isInactive ? 'task-row-inactive' : ''} fs-6`}
                          >
                            <td className="text-center fw-bold">#{formatDisplayId(taskId)}</td>
                            <td className="text-center">
                              <span className={`badge fs-6 ${task.priority === 'High' ? 'bg-danger' : task.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge fs-6 ${
                                task.status === 'Completed' ? 'bg-success' : 
                                task.status === 'In Progress' ? 'bg-primary' :
                                task.status === 'Expired' ? 'bg-secondary' : 'bg-warning text-dark'
                              }`}>
                                {mapApiToStatus(task.status)}
                              </span>
                            </td>
                            <td className="text-center">{formatDate(task.deadline)}</td>
                            <td className="text-center">{task.startTime ? formatDate(task.startTime) : "None"}</td>
                            <td className="text-center">{task.hours}h</td>
                            <td className="text-start text-truncate" style={{ maxWidth: "150px" }}>
                              {task.details.length > 30 
                                ? `${task.details.substring(0, 30)}...` 
                                : task.details}
                            </td>
                            <td>
                              <div className="d-flex justify-content-center gap-2">
                                <button
                                  onClick={() => viewTaskDetails(task)}
                                  className="btn btn-sm btn-outline-primary"
                                  title="View details"
                                  disabled={disabledButtons[`viewTask-${task.id || task._id}`]}
                                >
                                  <i className="fas fa-eye"></i> <span className="d-none d-md-inline">View</span>
                                </button>
                                <button
                                  onClick={() => editTask(task)}
                                  className="btn btn-sm btn-outline-secondary"
                                  title="Edit task"
                                  disabled={disabledButtons[`editTask-${task.id || task._id}`]}
                                >
                                  <i className="fas fa-edit"></i> <span className="d-none d-md-inline">Update</span>
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id || task._id)}
                                  className="btn btn-sm btn-outline-danger"
                                  title="Delete task"
                                  disabled={disabledButtons[`deleteTask-${task.id || task._id}`]}
                                >
                                  <i className="fas fa-trash"></i> <span className="d-none d-md-inline">Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination control - Display only when table view and multiple pages */}
        {!showCalendar && !loading && tasks.length > 0 && pagination.pages > 1 && (
          <nav aria-label="Task pagination">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => paginate(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
              </li>
              
              {/* Page number buttons */}
              {Array.from({ length: pagination.pages }, (_, i) => (
                <li key={i + 1} className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => paginate(i + 1)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              
              <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => paginate(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </li>
            </ul>
            <div className="text-center text-muted small">
              Page {pagination.page} of {pagination.pages}, {pagination.total} items total
            </div>
          </nav>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {showEditModal ? "Edit Task" : "New Task"}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={closeModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">
                      Priority <span className="text-danger">*</span>
                    </label>
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
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData(prev => {
                          const newStatus = e.target.value;
                          // Reset start time when changing to To Do
                          if (newStatus === TASK_STATUS.TODO) {
                            return { ...prev, status: newStatus, startTime: '' };
                          }
                          return { ...prev, status: newStatus };
                        })
                      }
                      className="form-select"
                    >
                      <option value={TASK_STATUS.TODO}>To Do</option>
                      <option value={TASK_STATUS.IN_PROGRESS}>In Progress</option>
                      <option value={TASK_STATUS.DONE}>Done</option>
                    </select>
                    {formData.status === 'Expired' && (
                      <small className="form-text text-muted">
                        The "Expired" status is automatically assigned by the system when a deadline has passed.
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <label htmlFor="updateStartTime" className="form-label fw-bold">
                      Start Date {(formData.status === 'In Progress' || formData.status === 'Done') && 
                      <span className="text-danger">*</span>}
                    </label>
                    <div className="position-relative">
                      <input
                        type="date"
                        className="form-control custom-date-input"
                        id="updateStartTime"
                        value={formData.startTime || ''}
                        onChange={(e) => {
                          const newStartTime = e.target.value;
                          setFormData({ 
                            ...formData, 
                            startTime: newStartTime,
                            deadline: formData.deadline && newStartTime > formData.deadline ? '' : formData.deadline
                          });
                        }}
                        required={formData.status === 'In Progress' || formData.status === 'Done'}
                        max={formData.deadline || undefined}
                        lang="en"
                      />
                      {formData.startTime && (
                        <div className="date-display position-absolute">
                          {new Date(formData.startTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                    {(formData.status === 'In Progress' || formData.status === 'Done') && (
                      <small className="text-muted">
                        Required for In Progress and Done tasks
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <label htmlFor="updateDeadline" className="form-label fw-bold">
                      Due Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control custom-date-input"
                      id="updateDeadline"
                      value={formData.deadline || ''}
                      onChange={(e) => {
                        const newDeadline = e.target.value;
                        setFormData({ ...formData, deadline: newDeadline });
                      }}
                      min={formData.startTime || getTodayDateString()}
                      required
                      lang="en"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Time Estimate (hours) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.hours}
                      onChange={(e) =>
                        setFormData({ ...formData, hours: e.target.value })
                      }
                      min="1"
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      value={formData.details}
                      onChange={(e) =>
                        setFormData({ ...formData, details: e.target.value })
                      }
                      rows="3"
                      className="form-control"
                      required
                    ></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                      {isProcessing ? 
                        (showEditModal ? 'Saving...' : 'Adding...') : 
                        (showEditModal ? 'Save Changes' : 'Add Task')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Task Details Modal */}
      {showViewModal && viewingTask && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Task Details</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={closeViewModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="view-only-form">
                  <div className="mb-3">
                    <label className="form-label fw-bold">ID</label>
                    <input
                      type="text"
                      value={`#${formatDisplayId(viewingTask._id || viewingTask.id)}`}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Priority</label>
                    <div className="form-control bg-light d-flex align-items-center">
                      <span className={`badge ${viewingTask.priority === 'High' ? 'bg-danger' : viewingTask.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-success'}`}>
                        {viewingTask.priority}
                      </span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Status</label>
                    <div className="form-control bg-light d-flex align-items-center">
                      <span className={`badge ${
                        viewingTask.status === 'Completed' ? 'bg-success' : 
                        viewingTask.status === 'In Progress' ? 'bg-primary' :
                        viewingTask.status === 'Expired' ? 'bg-secondary' : 'bg-warning text-dark'
                      }`}>
                        {viewingTask.status}
                      </span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Start Date</label>
                    <input
                      type="text"
                      value={viewingTask.startTime ? formatDate(viewingTask.startTime) : "None"}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Deadline</label>
                    <input
                      type="text"
                      value={formatDate(viewingTask.deadline)}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Estimated Hours</label>
                    <input
                      type="text"
                      value={`${viewingTask.hours}h`}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Description</label>
                    <textarea
                      value={viewingTask.details}
                      rows="3"
                      className="form-control bg-light"
                      readOnly
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={closeViewModal} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={cancelDelete}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button onClick={cancelDelete} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="btn btn-danger" disabled={isProcessing}>
                  {isProcessing ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模态框背景遮罩 */}
      {(showAddModal || showEditModal || showDeleteModal || showViewModal) && (
        <div 
          className="modal-backdrop fade show"
          onClick={closeModal}
        ></div>
      )}
    </div>
  );
}

// 添加一个处理 ID 显示的工具函数
const formatDisplayId = (id) => {
  if (!id) return '000000';
  // 转换为字符串并获取最后6位
  const idStr = String(id);
  return idStr.slice(-6).padStart(6, '0');
};

export default TodoList; 