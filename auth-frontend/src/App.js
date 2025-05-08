import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Example from './components/Example';
import { getCSRFToken } from './services/auth';

function App() {
  useEffect(() => {
    // Получение CSRF-токена при запуске приложения
    getCSRFToken();
  }, []);

  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/example" element={<Example />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
