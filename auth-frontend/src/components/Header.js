import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ isAuthenticated }) => {
  const navigate = useNavigate();

  return (
    <header className="main-header">
      <Link to="/" className="logo">
        <span>FITNESS</span>PRO
      </Link>
      
      <nav className="main-nav">
        <Link to="/schedule" className="nav-link">Расписание</Link>
        <Link to="/trainers" className="nav-link">Тренеры</Link>
        <Link to="/pricing" className="nav-link">Тарифы</Link>
      </nav>
    </header>
  );
};

export default Header; 