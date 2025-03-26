# Todo App Frontend

A modern, responsive task management application built with React.

## Features

- **User Authentication**: Secure login and registration system
- **Task Management**: Create, read, update, and delete tasks
- **Task Prioritization**: Assign high, medium, or low priority to tasks
- **Deadline Tracking**: Set and monitor task deadlines
- **Filtering & Sorting**: Sort tasks by priority or deadline, and filter by status
- **Calendar View**: Visual representation of tasks by deadline date
- **Responsive Design**: Works on desktop and mobile devices

## Technologies

- React
- React Router for navigation
- CSS for styling (with responsive design)
- Axios for API communication

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/todo-frontend.git
   cd todo-frontend
   ```

2. Install dependencies
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Start the development server
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   │   ├── Login.jsx
│   │   └── SignUp.jsx
│   └── todo/          # Todo management components
│       └── TodoList.jsx
├── services/
│   └── api.js         # API service for backend communication
├── styles/            # CSS files
│   ├── Auth.css
│   ├── common.css
│   └── TodoList.css
├── App.js             # Main application component
└── index.js           # Application entry point
```

## Usage

### Authentication

- **Registration**: Create a new account with name, email, and password
- **Login**: Access your account with email and password

### Task Management

- **Add Task**: Create new tasks with priority, deadline, and details
- **View Tasks**: See all tasks in a sortable table view
- **Edit Task**: Modify task details, priority, or deadline
- **Delete Task**: Remove tasks with confirmation
- **Calendar View**: Toggle to view tasks by deadline date

## API Integration

The application is designed to connect to a backend API. By default, it connects to `http://localhost:5001`. You can change the API endpoint in `src/services/api.js`.

## Customization

- **Colors**: Update theme colors in the CSS files
- **API Endpoint**: Configure the backend URL in `src/services/api.js`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FontAwesome for icons
- React and React Router for the framework
