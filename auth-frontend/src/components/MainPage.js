import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

const MainPage = () => {
    const navigate = useNavigate();

    return (
        <div className="main-page">
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Начни свой фитнес-путь сегодня!</h1>
                    <p>Персональные тренировки и питание от лучших тренеров</p>
                    <button 
                        className="cta-button"
                        onClick={() => navigate('/register')}
                    >
                        Начать сейчас
                    </button>
                </div>
            </section>

            <section className="features-section">
                <div className="feature-card">
                    <h3>Персональные тренировки</h3>
                    <p>Индивидуальная программа под ваши цели</p>
                </div>
                <div className="feature-card">
                    <h3>Питание</h3>
                    <p>Сбалансированные рационы от диетологов</p>
                </div>
                <div className="feature-card">
                    <h3>Сообщество</h3>
                    <p>Поддержка единомышленников</p>
                </div>
            </section>

            <section className="schedule-section">
                <h2>Расписание занятий</h2>
                <div className="schedule-grid">
                    <div className="schedule-item">
                        <h4>Йога</h4>
                        <p>Пн/Ср/Пт - 9:00</p>
                    </div>
                    <div className="schedule-item">
                        <h4>Кроссфит</h4>
                        <p>Вт/Чт - 19:00</p>
                    </div>
                </div>
                <button 
                    className="schedule-button"
                    onClick={() => navigate('/schedule')}
                >
                    Полное расписание
                </button>
            </section>
        </div>
    );
};

export default MainPage;
