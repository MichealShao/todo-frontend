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
    sortField: 'createdAt',
    sortDirection: 'desc'
  });

  // Control various modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Delete countdown
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  // Timer reference for clearing
  const deleteTimerRef = useRef(null);

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
    status: "Pending"
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
      const response = await tasksAPI.getAllTasks(
        pagination.page, 
        pagination.limit,
        sortOptions.sortField,
        sortOptions.sortDirection
      );
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
      setError('Failed to load tasks. Please refresh the page and try again.');
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
      sortField: 'createdAt',
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

  // ---------------------------
  // 5. Add new task
  // ---------------------------
  const openAddModal = () => {
    // Initialize form
    setFormData({
      priority: "Medium",
      deadline: "",
      hours: "",
      details: "",
      status: "Pending"
    });
    setShowAddModal(true);
  };
  const closeAddModal = () => setShowAddModal(false);

  // ---------------------------
  // 6. Edit task
  // ---------------------------
  const editTask = (task) => {
    // Ensure date format is correct, convert to YYYY-MM-DD format
    const formattedDeadline = task.deadline ? 
      (typeof task.deadline === 'string' ? 
        task.deadline.split('T')[0] : 
        new Date(task.deadline).toISOString().split('T')[0]) : 
      '';
    
    // Ensure status is correctly set
    console.log('Editing task, current status:', task.status);
    // Confirm task ID format
    const taskId = task.id || task._id; // Compatible with different ID field names
    console.log('Editing task ID:', taskId);
    
    if (!taskId) {
      console.error('Task missing ID field:', task);
      setError('Cannot edit task: Missing task ID');
      return;
    }
    
    // Initialize form
    setFormData({
      priority: task.priority || 'Medium',
      deadline: formattedDeadline,
      hours: task.hours || '',
      details: task.details || '',
      status: task.status || 'Pending' // Ensure status value is correctly passed
    });
    
    setEditingTaskId(taskId);
    setShowEditModal(true);
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTaskId(null);
  };

  // ---------------------------
  // 7. View task details
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
  // 8. Delete task
  // ---------------------------
  const deleteTask = (id) => {
    // Ensure valid ID
    if (!id) {
      console.error('Attempted to delete task but ID is missing');
      setError('Cannot delete task: Missing task ID');
      return;
    }
    
    console.log('Preparing to delete task ID:', id);
    setDeleteTaskId(id);
    setShowDeleteModal(true);
    setDeleteCountdown(5);
    // Start 5-second countdown
    clearInterval(deleteTimerRef.current);
    deleteTimerRef.current = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          // Countdown ended => auto delete
          confirmDelete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const confirmDelete = async () => {
    clearInterval(deleteTimerRef.current);
    
    console.log('Preparing to delete task ID:', deleteTaskId);
    
    try {
      const response = await tasksAPI.deleteTask(deleteTaskId);
      console.log('Task deleted successfully:', response);
      
      // Regardless of API call result, ensure task is removed from local state
      setTasks((prev) => prev.filter((t) => {
        const taskId = t.id || t._id;
        return taskId !== deleteTaskId;
      }));
      
      setError(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      console.log('Delete error details:', err.response?.data || err.message);
      setError('Failed to delete task. Please try again.');
      
      // Even if API call fails, remove task from local state to ensure UI updates promptly
      setTasks((prev) => prev.filter((t) => {
        const taskId = t.id || t._id;
        return taskId !== deleteTaskId;
      }));
    } finally {
      setShowDeleteModal(false);
      setDeleteTaskId(null);
    }
  };

  const cancelDelete = () => {
    clearInterval(deleteTimerRef.current);
    setShowDeleteModal(false);
    setDeleteTaskId(null);
  };

  // ---------------------------
  // 9. Submit form (Add or Edit)
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Debug: Check submitted form data
    console.log('Submitted form data:', formData);
    console.log('Editing task ID:', editingTaskId);
    
    // Validate form data
    if (!formData.details || formData.details.trim() === '') {
      setError('Task details cannot be empty');
      return;
    }
    
    // For new tasks, validate deadline is not before current date
    if (!showEditModal && formData.deadline) {
      // Use string comparison to avoid timezone and time issues
      const currentDateStr = new Date().toISOString().split('T')[0];
      
      // If deadline is strictly before today, do not allow
      if (formData.deadline < currentDateStr) {
        setError('Deadline cannot be before today. Please select today or a future date.');
        return;
      }
    }
    
    // Check if task is expired
    // Use string comparison to avoid timezone and time issues
    const currentDateStr = new Date().toISOString().split('T')[0];
    const isExpired = formData.deadline < currentDateStr;
    
    // If expired and status is not "Completed", automatically set to "Expired"
    let autoStatus = formData.status;
    if (isExpired && formData.status !== 'Completed') {
      autoStatus = 'Expired';
      console.log('Task is expired, automatically setting status to Expired');
    }
    
    // Ensure numeric fields have correct default values
    const taskData = {
      ...formData,
      priority: formData.priority || 'Medium',
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      hours: formData.hours ? parseInt(formData.hours, 10) : 1,
      status: autoStatus || 'Pending'
    };
    
    // Debug: Check prepared data to send
    console.log('Prepared task data to send:', taskData);
    
    if (showEditModal) {
      // Edit mode
      try {
        console.log('Preparing to update task ID:', editingTaskId, 'Data:', taskData);
        
        // Defensive programming: Ensure edit ID exists
        if (!editingTaskId) {
          console.error('Missing ID when updating task');
          setError('Task ID is missing. Please refresh and try again.');
          return;
        }
        
        const updatedTask = await tasksAPI.updateTask(editingTaskId, taskData);
        console.log('Task updated successfully:', updatedTask, 'Original status:', formData.status, 'Updated status:', updatedTask.status);
        
        // Update local task data
        setTasks((prev) => {
          return prev.map((t) => {
            // Compatible with different ID field names
            const taskId = t.id || t._id;
            if (taskId === editingTaskId) {
              // Use API returned data or form data for update
              // Ensure ID is preserved
              const result = {
                ...t,
                ...taskData,
                id: taskId, // Ensure ID is not lost
                displayId: t.displayId // Ensure display ID is unchanged
              };
              
              // If API returned complete data, use API data but preserve ID
              if (updatedTask) {
                result.status = updatedTask.status || result.status;
                result.priority = updatedTask.priority || result.priority;
                result.deadline = updatedTask.deadline || result.deadline;
                result.hours = updatedTask.hours || result.hours;
                result.details = updatedTask.details || result.details;
              }
              
              console.log('Updated task object:', result);
              return result;
            }
            return t;
          });
        });
        
        // Temporarily commented out re-fetch to avoid interface refresh causing state loss
        // if (sortOptions.sortField === 'status') {
        //   fetchTasks();
        // }
      } catch (err) {
        console.error('Failed to update task:', err);
        console.log('Error details:', err.response?.data || err.message);
        
        // More detailed error information
        if (err.response?.data) {
          setError(`Failed to update task: ${err.response.data.message || JSON.stringify(err.response.data)}`);
        } else {
          setError('Failed to update task. Please try again. ' + (err.message || ''));
        }
        
        // Even if API call fails, update local state to improve user experience
        if (editingTaskId) {
          setTasks((prev) => {
            return prev.map((t) => {
              // Compatible with different ID field names
              const taskId = t.id || t._id;
              if (taskId === editingTaskId) {
                return {
                  ...t,
                  ...taskData,
                  id: taskId, // Ensure ID is not lost
                  displayId: t.displayId // Ensure display ID is unchanged
                };
              }
              return t;
            });
          });
        }
        
        // Don't close modal, let user retry
        return;
      }
      closeEditModal();
    } else {
      // Add mode
      try {
        console.log('Preparing to create new task:', taskData);
        
        // Ensure new task has creation time field
        const taskWithCreatedAt = {
          ...taskData,
          createdAt: new Date().toISOString()
        };
        
        const newTask = await tasksAPI.createTask(taskWithCreatedAt);
        console.log('New task created successfully:', newTask);
        
        // Generate display ID for new task
        const displayId = generateDisplayId(newTask);

        // Add new task with display ID
        setTasks((prev) => [...prev, {
          ...newTask,
          displayId: displayId
        }]);
      } catch (err) {
        console.error('Failed to create task:', err.response?.data || err.message || err);
        setError('Failed to create task. Please try again.');
      }
      closeAddModal();
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
      status: "Pending"
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
        
        // If status is the same, sort by the current sort field and direction
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
      {/* Header */}
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
              className="add-button"
            >
              <i className="fas fa-plus text-sm"></i>
              Add Task
            </button>
            <button
              onClick={handleLogout}
              className="logout-button"
            >
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Search and filter area */}
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
                <span>Daily Deadlines</span>
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
                <i className="fas fa-redo-alt"></i> Reset
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
                        <div className="date-task-actions">
                          <button onClick={() => viewTaskDetails(task)} className="date-task-button" title="View details">
                            <i className="fas fa-eye"></i>
                          </button>
                          <button onClick={() => editTask(task)} className="date-task-button" title="Edit task">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => deleteTask(task.id || task._id)} className="date-task-button" title="Delete task">
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
              <table className="task-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th className="sortable" onClick={() => sortBy("status")}>
                      Status
                      <i className={`fas ${sortOptions.sortField === 'status' 
                        ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                        : 'fa-sort'}`}></i>
                    </th>
                    <th className="sortable" onClick={() => sortBy("priority")}>
                      Priority 
                      <i className={`fas ${sortOptions.sortField === 'priority' 
                        ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                        : 'fa-sort'}`}></i>
                    </th>
                    <th className="sortable" onClick={() => sortBy("deadline")}>
                      Deadline 
                      <i className={`fas ${sortOptions.sortField === 'deadline' 
                        ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                        : 'fa-sort'}`}></i>
                    </th>
                    <th className="sortable" onClick={() => sortBy("createdAt")}>
                      Create Time 
                      <i className={`fas ${sortOptions.sortField === 'createdAt' 
                        ? (sortOptions.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') 
                        : 'fa-sort'}`}></i>
                    </th>
                    <th className="task-hours">Est. Hours</th>
                    <th>Details</th>
                    <th className="actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTasks.map((task) => {
                    const isInactive = task.status === 'Completed' || task.status === 'Expired';
                    return (
                      <tr
                        key={task.id}
                        className={`task-row task-row-${task.priority.toLowerCase()} ${isInactive ? 'task-row-inactive' : ''}`}
                      >
                        <td className="task-id">#{task.displayId || '0000'}</td>
                        <td>
                          <span className={`status-badge status-${(task.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                            {task.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="task-deadline">{formatDate(task.deadline)}</td>
                        <td className="task-create-time">{formatDate(task.createdAt)}</td>
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
                              title="View details"
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                            <button
                              onClick={() => editTask(task)}
                              className="action-button edit-button"
                              title="Update task"
                            >
                              <i className="fas fa-edit"></i> Update
                            </button>
                            <button
                              onClick={() => deleteTask(task.id || task._id)}
                              className="action-button delete-button"
                              title="Delete task"
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination control - Display only when table view and multiple pages */}
        {!showCalendar && !loading && tasks.length > 0 && pagination.pages > 1 && (
          <div className="pagination">
            {renderPaginationButtons()}
            <span className="pagination-info">
              Page {pagination.page} of {pagination.pages}, {pagination.total} items total
            </span>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">
              {showEditModal ? "Update Task" : "Add New Task"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Status <span className="required">*</span>
                </label>
                <div className="form-select-container">
                  <select
                    value={formData.status || "Pending"}
                    onChange={(e) => {
                      // Add logging to track status change
                      console.log('Status changed from', formData.status, 'to', e.target.value);
                      setFormData({ ...formData, status: e.target.value });
                    }}
                    className="form-select"
                    disabled={!showEditModal} // Fixed as Pending when adding, editable when updating
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <i className="fas fa-chevron-down select-arrow"></i>
                </div>
                {formData.deadline && (() => {
                  // Fix date comparison logic
                  const currentDate = new Date();
                  // Remove timezone impact method: Use date part exact comparison
                  const currentDateStr = currentDate.toISOString().split('T')[0]; // For example '2023-03-26'
                  const deadlineDateStr = formData.deadline; // Already 'YYYY-MM-DD' format
                  
                  // Debug
                  console.log('Current date:', currentDateStr, 'Deadline date:', deadlineDateStr);
                  
                  // Only show warning when deadline is strictly earlier than current date and status is not "Completed"
                  return deadlineDateStr < currentDateStr && formData.status !== 'Completed' ? (
                    <p className="form-hint" style={{color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                      This task is past its deadline and will be marked as Expired upon save.
                    </p>
                  ) : null;
                })()}
              </div>
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
                  // Ensure today (today) is selectable earliest date
                  min={!showEditModal ? new Date().toISOString().split('T')[0] : undefined}
                  className="form-input"
                  style={{ boxSizing: 'border-box', width: '100%' }}
                  required
                />
                {!showEditModal && (
                  <p className="form-hint" style={{fontSize: '0.8rem', marginTop: '0.25rem', color: '#6b7280'}}>
                    Deadline can be today or any future date
                  </p>
                )}
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
                  {showEditModal ? "Update Task" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Details Modal */}
      {showViewModal && viewingTask && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">View Task Details</h2>
            <div className="form-content">
              <div className="form-group">
                <label className="form-label">
                  Task ID
                </label>
                <input
                  type="text"
                  value={viewingTask.displayId || '0000'}
                  className="form-input"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Status
                </label>
                <div className="form-select-container">
                  <input
                    type="text"
                    value={viewingTask.status || 'Pending'}
                    className="form-input"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Priority
                </label>
                <div className="form-select-container">
                  <input
                    type="text"
                    value={viewingTask.priority}
                    className="form-input"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Deadline
                </label>
                <input
                  type="text"
                  value={formatDate(viewingTask.deadline)}
                  className="form-input"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Create Time
                </label>
                <input
                  type="text"
                  value={formatDate(viewingTask.createdAt) || 'Not recorded'}
                  className="form-input"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Estimated Hours
                </label>
                <input
                  type="text"
                  value={`${viewingTask.hours}h`}
                  className="form-input"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Details
                </label>
                <textarea
                  value={viewingTask.details}
                  rows="3"
                  className="form-textarea"
                  style={{ boxSizing: 'border-box', width: '100%' }}
                  readOnly
                />
              </div>
              
              <div className="form-buttons">
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="submit-button"
                >
                  Close
                </button>
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