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

  // Generate short but unique display ID (based on date + random number)
  const generateDisplayId = (task) => {
    // Use creation date (if available) or current date
    const dateStr = task.createdAt || new Date().toISOString();
    const date = new Date(dateStr);
    
    // Format: YYMMDD-RRR (year-month-day-3-digit random number)
    const yy = date.getFullYear().toString().slice(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    
    // Generate 3-digit random number (100-999)
    const randomNum = Math.floor(100 + Math.random() * 900);
    
    return `${yy}${mm}${dd}-${randomNum}`;
  };

  // Pagination related states
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [sortOptions, setSortOptions] = useState({
    sortField: 'deadline',
    sortDirection: 'asc'
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
      
      // Generate display ID for each task
      const tasksWithDisplayId = response.tasks.map(task => ({
        ...task,
        displayId: task.displayId || generateDisplayId(task)
      }));
      
      setTasks(tasksWithDisplayId);
      
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
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ---------------------------
  // 4. Sort switch
  // ---------------------------
  const sortBy = (field) => {
    if (sortOptions.sortField === field) {
      // If already this field, loop switch: asc <-> desc
      // Infinite loop switch sorting direction
      setSortOptions({
        sortField: field,
        sortDirection: sortOptions.sortDirection === "asc" ? "desc" : "asc"
      });
    } else {
      // New field, sort from small to large (first click)
      setSortOptions({
        sortField: field,
        sortDirection: "asc"
      });
    }
  };

  // Reset sorting and filtering
  const resetFilters = () => {
    setSortOptions({
      sortField: 'deadline',
      sortDirection: 'asc'
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

  // 添加按钮防抖函数
  const debounceOperation = (operationId, callback, delay = 1000) => {
    if (disabledButtons[operationId]) {
      return; // 如果按钮已被禁用，直接返回
    }
    
    // 设置按钮为禁用状态
    setDisabledButtons(prev => ({ ...prev, [operationId]: true }));
    
    // 执行回调
    callback();
    
    // 延迟后启用按钮
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [operationId]: false }));
    }, delay);
  };

  // ---------------------------
  // 5. Add new task
  // ---------------------------
  const openAddModal = () => {
    debounceOperation('addTask', () => {
      // Initialize form
      setFormData({
        priority: "Medium",
        deadline: "",
        hours: "",
        details: "",
        status: "Pending",
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
      // Ensure date format is correct, convert to YYYY-MM-DD format
      const formattedDeadline = task.deadline ? 
        (typeof task.deadline === 'string' ? 
          task.deadline.split('T')[0] : 
          new Date(task.deadline).toISOString().split('T')[0]) : 
        '';
        
      // Format start time if exists
      const formattedStartTime = task.startTime ? 
        (typeof task.startTime === 'string' ? 
          task.startTime.split('T')[0] : 
          new Date(task.startTime).toISOString().split('T')[0]) : 
        '';
      
      console.log('Editing task, current status:', task.status);
      console.log('Editing task ID:', taskId);
      
      if (!taskId) {
        console.error('Task missing ID field:', task);
        setError('Task ID is missing. Please refresh the page and try again.');
        return;
      }
      
      // Initialize form
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
    
    if (isProcessing) return; 
    setIsProcessing(true);
    setError(null);
    
    // Validate form data
    if (!formData.details || formData.details.trim() === '') {
      setError('Please enter task details. This field cannot be empty.');
      setIsProcessing(false);
      return;
    }
    
    // For new tasks, validate deadline is not before current date
    const currentDateStr = new Date().toISOString().split('T')[0];
    if (formData.deadline < currentDateStr) {
      setError('Deadline cannot be before today. Please select today or a future date.');
      setIsProcessing(false);
      return;
    }
    
    // Validate deadline is not before start time
    if (formData.startTime && formData.deadline && formData.deadline < formData.startTime) {
      setError('Deadline cannot be earlier than Start Time. Please adjust the dates.');
      setIsProcessing(false);
      return;
    }

    const taskData = {
      ...formData,
      priority: formData.priority || 'Medium',
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      hours: formData.hours ? parseInt(formData.hours, 10) : 1,
      status: formData.status || 'Pending',
      startTime: formData.startTime
    };

    try {
      if (showEditModal) {
        // Edit mode
        if (!editingTaskId) {
          setError('Task ID is missing. Please refresh the page and try again.');
          setIsProcessing(false);
          return;
        }
        
        const updatedTask = await tasksAPI.updateTask(editingTaskId, taskData);
        
        setTasks((prev) => {
          return prev.map((t) => {
            const taskId = t.id || t._id;
            if (taskId === editingTaskId) {
              return {
                ...t,
                ...updatedTask,
                id: taskId,
                displayId: t.displayId
              };
            }
            return t;
          });
        });
        
        closeEditModal();
      } else {
        // Add mode
        const taskWithCreatedAt = {
          ...taskData,
          createdAt: new Date().toISOString()
        };
        
        const newTask = await tasksAPI.createTask(taskWithCreatedAt);
        
        // Generate display ID for new task
        const displayId = generateDisplayId(newTask);

        setTasks((prev) => [...prev, {
          ...newTask,
          displayId: displayId
        }]);
        
        closeAddModal();
      }
    } catch (err) {
      console.error('Failed to process task:', err);
      setError(showEditModal ? 'Failed to update task. Please try again.' : 'Failed to create task. Please try again.');
    } finally {
      setTimeout(() => setIsProcessing(false), 500); // 延迟恢复状态
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
    
    // Current date for detecting expired tasks
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of day
    
    // First copy the array to avoid direct modification of the original
    return [...tasks]
      // First mark expired tasks
      .map(task => {
        // Copy task object to avoid modifying the original
        const taskCopy = {...task};
        
        // Check if task is expired
        if (task.status !== 'Completed') {
          const deadline = new Date(task.deadline);
          deadline.setHours(0, 0, 0, 0); // Set to start of day
          if (deadline < currentDate) {
            taskCopy.status = 'Expired';
          }
        }
        
        return taskCopy;
      })
      // Apply status filter
      .filter(task => {
        if (!filters.status) return true;
        return task.status === filters.status;
      })
      // Apply priority filter
      .filter(task => {
        if (!filters.priority) return true;
        return task.priority === filters.priority;
      })
      // Then apply search filter
      .filter(task => {
        if (!searchQuery) return true;
        
        // Search across various task fields
        const query = searchQuery.toLowerCase();
        return (
          (task.details && task.details.toLowerCase().includes(query)) ||
          (task.status && task.status.toLowerCase().includes(query)) ||
          (task.priority && task.priority.toLowerCase().includes(query)) ||
          (task.displayId && task.displayId.toLowerCase().includes(query))
        );
      })
      // Finally sort the results
      .sort((a, b) => {
        // First check status - completed and expired tasks go to the bottom
        const aIsInactive = a.status === 'Completed' || a.status === 'Expired';
        const bIsInactive = b.status === 'Completed' || b.status === 'Expired';
        
        if (aIsInactive && !bIsInactive) return 1;  // a goes to the bottom
        if (!aIsInactive && bIsInactive) return -1; // b goes to the bottom
        
        // If both are inactive or both are active, then sort by the current sort field
        if (aIsInactive === bIsInactive) {
          if (sortOptions.sortField) {
            const aValue = a[sortOptions.sortField];
            const bValue = b[sortOptions.sortField];
            
            // Handle different types of values
            if (aValue === bValue) return 0;
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            // Return comparison result based on sort direction
            const direction = sortOptions.sortDirection === 'asc' ? 1 : -1;
            return aValue < bValue ? -1 * direction : 1 * direction;
          }
        }
        
        return 0;
      });
  }, [tasks, sortOptions.sortField, sortOptions.sortDirection, searchQuery, filters]);

  // Calculate today's todo count after filteredAndSortedTasks memo
  const todayTodoCount = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Filter tasks due today that are not completed/expired
    return tasks.filter(task => {
      const deadlineDate = task.deadline?.split('T')[0] || '';
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
                <span className="stat-label">Today's Tasks</span>
                <span className="stat-value">{todayTodoCount}</span>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="btn btn-success d-flex align-items-center gap-2"
              disabled={disabledButtons['addTask']}
            >
              <i className="fas fa-plus"></i>
              <span className="d-none d-sm-inline">Add New Task</span>
              <span className="d-inline d-sm-none">Add</span>
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
                  placeholder="Search tasks..."
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
                <span className="d-none d-md-inline">Daily Deadlines</span>
              </button>
              
              <div className="filter-select-container">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Status (All)</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
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
                  <option value="">Priority (All)</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <i className="fas fa-filter filter-icon"></i>
              </div>
              
              <button 
                onClick={resetFilters}
                className="reset-button"
                title="Reset sorting and filtering"
              >
                <i className="fas fa-redo-alt"></i> <span className="d-none d-md-inline">Reset</span>
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {/* Calendar view and task table are mutually exclusive */}
        {showCalendar ? (
          <div className="calendar-container-wrapper">
            <div className="calendar-header">
              <h3>Daily Deadlines</h3>
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
                  Tasks Due on {selectedDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </h4>
                {tasksBySelectedDate.length === 0 ? (
                  <p className="no-tasks">No tasks due on this date</p>
                ) : (
                  <ul className="date-tasks-list">
                    {tasksBySelectedDate.map(task => (
                      <li key={task.id || task._id} className="date-task-item" data-priority={task.priority.toLowerCase()}>
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
                <p>No tasks yet. Click the "Add Task" button to create your first task.</p>
              </div>
            ) : (
              <div className="card shadow-sm mb-4">
                <div className="card-body overflow-auto">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr className="text-center fs-6">
                        <th className="text-center">ID</th>
                        <th className="sortable text-center" onClick={() => sortBy("priority")}>
                          Priority 
                          <i className={`fas ${sortOptions.sortField === 'priority' 
                            ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                            : 'fa-sort'}`} title={
                              sortOptions.sortField === 'priority' 
                                ? (sortOptions.sortDirection === 'asc' ? 'Click for descending order' : 'Click to cancel sorting') 
                                : 'Click for ascending order'
                            }></i>
                        </th>
                        <th className="sortable text-center" onClick={() => sortBy("status")}>
                          Status 
                          <i className={`fas ${sortOptions.sortField === 'status' 
                            ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                            : 'fa-sort'}`} title={
                              sortOptions.sortField === 'status' 
                                ? (sortOptions.sortDirection === 'asc' ? 'Click for descending order' : 'Click to cancel sorting') 
                                : 'Click for ascending order'
                            }></i>
                        </th>
                        <th className="sortable text-center" onClick={() => sortBy("deadline")}>
                          Deadline 
                          <i className={`fas ${sortOptions.sortField === 'deadline' 
                            ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                            : 'fa-sort'}`} title={
                              sortOptions.sortField === 'deadline' 
                                ? (sortOptions.sortDirection === 'asc' ? 'Click for descending order' : 'Click to cancel sorting') 
                                : 'Click for ascending order'
                            }></i>
                        </th>
                        <th className="sortable text-center" onClick={() => sortBy("startTime")}>
                          Start Time
                          <i className={`fas ${sortOptions.sortField === 'startTime' 
                            ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                            : 'fa-sort'}`} title={
                              sortOptions.sortField === 'startTime' 
                                ? (sortOptions.sortDirection === 'asc' ? 'Click for descending order' : 'Click to cancel sorting') 
                                : 'Click for ascending order'
                            }></i>
                        </th>
                        <th className="text-center">Est. Hours</th>
                        <th className="sortable text-center" onClick={() => sortBy("createdAt")}>
                          Create Time
                          <i className={`fas ${sortOptions.sortField === 'createdAt' 
                            ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                            : 'fa-sort'}`} title={
                              sortOptions.sortField === 'createdAt' 
                                ? (sortOptions.sortDirection === 'asc' ? 'Click for descending order' : 'Click to cancel sorting') 
                                : 'Click for ascending order'
                            }></i>
                        </th>
                        <th className="text-center">Details</th>
                        <th className="actions-header text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedTasks.map((task) => {
                        const isInactive = task.status === 'Completed' || task.status === 'Expired';
                        return (
                          <tr
                            key={task.id}
                            className={`task-row task-row-${task.priority.toLowerCase()} ${isInactive ? 'task-row-inactive' : ''} fs-6`}
                          >
                            <td className="text-center fw-bold">#{task.displayId || '0000'}</td>
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
                                {task.status}
                              </span>
                            </td>
                            <td className="text-center">{formatDate(task.deadline)}</td>
                            <td className="text-center">{task.startTime ? formatDate(task.startTime) : "None"}</td>
                            <td className="text-center">{task.hours}h</td>
                            <td className="text-center">{formatDate(task.createdAt)}</td>
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
                  {showEditModal ? "Edit Task" : "Add New Task"}
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
                          // Reset start time when changing to Pending
                          if (e.target.value === 'Pending') {
                            return { ...prev, status: e.target.value, startTime: '' };
                          }
                          return { ...prev, status: e.target.value };
                        })
                      }
                      className="form-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                    {showEditModal && formData.status === 'Expired' && (
                      <small className="form-text text-muted">
                        The "Expired" status is automatically assigned by the system when a deadline has passed.
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Start Time {formData.status === 'In Progress' && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="date"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="form-control"
                      disabled={formData.status === 'Pending'}
                      required={formData.status === 'In Progress'}
                      min={new Date().toISOString().split('T')[0]} // Can't select dates before today
                    />
                    {formData.status === 'Pending' && (
                      <small className="form-text text-muted">
                        Start time can only be set when task is In Progress or Completed.
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Deadline <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, deadline: e.target.value })
                      }
                      className="form-control"
                      required
                      min={formData.status === 'In Progress' && formData.startTime ? formData.startTime : new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Estimated Hours <span className="text-danger">*</span>
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
                      Details <span className="text-danger">*</span>
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
                      value={`#${viewingTask.displayId || viewingTask.id}`}
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
                    <label className="form-label fw-bold">Start Time</label>
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
                    <label className="form-label fw-bold">Details</label>
                    <textarea
                      value={viewingTask.details}
                      rows="3"
                      className="form-control bg-light"
                      readOnly
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Created At</label>
                    <input
                      type="text"
                      value={formatDate(viewingTask.createdAt)}
                      className="form-control bg-light"
                      readOnly
                    />
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
                  Are you sure you want to delete this task? This action cannot be
                  undone.
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

export default TodoList; 