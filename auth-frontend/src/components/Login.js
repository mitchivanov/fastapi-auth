import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, checkAuth } from '../services/auth';
import './Login.css';

const Login = () => {
    const [form, setForm] = useState({
        username: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const passwordRef = useRef(null);
    const eyesRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        updateEyePosition(e.target);
        
        if (name === 'password') {
            setIsPasswordFocused(true);
        } else {
            setIsPasswordFocused(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(form.username, form.password);
            const isAuth = await checkAuth();
            setIsAuthenticated(isAuth);
            navigate('/example');
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Ошибка входа');
        }
    };

    // Обновленная функция движения глаз
    const updateEyePosition = (inputElement) => {
        if (!eyesRef.current || !inputElement) return;
        
        // Если это поле пароля, глаза смотрят вверх
        if (inputElement.type === 'password') {
            if (eyesRef.current) {
                eyesRef.current.style.setProperty('--pupil-x', '0%');
                eyesRef.current.style.setProperty('--pupil-y', '-50%');
            }
            return;
        }
        
        const inputRect = inputElement.getBoundingClientRect();
        const eyesRect = eyesRef.current.getBoundingClientRect();
        
        // Получаем текущее положение каретки
        const selectionStart = inputElement.selectionStart || 0;
        const text = inputElement.value.substring(0, selectionStart);
        
        // Создаем временный элемент для измерения ширины текста до курсора
        const tempSpan = document.createElement('span');
        const computedStyle = window.getComputedStyle(inputElement);
        tempSpan.style.font = computedStyle.font;
        tempSpan.style.fontSize = computedStyle.fontSize;
        tempSpan.style.letterSpacing = computedStyle.letterSpacing;
        tempSpan.style.position = 'absolute';
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.whiteSpace = 'pre';
        tempSpan.textContent = text;
        document.body.appendChild(tempSpan);
        
        // Вычисляем точную позицию каретки
        const caretX = inputRect.left + tempSpan.offsetWidth + parseFloat(computedStyle.paddingLeft);
        const caretY = inputRect.top + (inputRect.height / 2);
        
        document.body.removeChild(tempSpan);
        
        // Вычисляем центр глаз
        const eyesCenterX = eyesRect.left + (eyesRect.width / 2);
        const eyesCenterY = eyesRect.top + (eyesRect.height / 2);
        
        // Вычисляем относительное положение каретки
        const deltaX = caretX - eyesCenterX;
        const deltaY = caretY - eyesCenterY;
        
        // Упрощаем расчет смещения зрачков для более естественного движения
        const maxOffset = 25;
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 300; // Максимальное расстояние для полного отклонения
        
        const factor = Math.min(distance / maxDistance, 1);
        const offsetX = Math.cos(angle) * maxOffset * factor;
        const offsetY = Math.sin(angle) * maxOffset * factor;
        
        if (eyesRef.current) {
            eyesRef.current.style.setProperty('--pupil-x', `${offsetX}%`);
            eyesRef.current.style.setProperty('--pupil-y', `${offsetY}%`);
        }
    };

    // Обновляем обработчики событий
    useEffect(() => {
        const inputs = document.querySelectorAll('input');
        const events = ['input', 'keyup', 'click', 'select', 'mouseup', 'focus'];
        
        const handleInputEvent = (e) => {
            if (e.target.tagName.toLowerCase() === 'input') {
                updateEyePosition(e.target);
            }
        };
        
        const handleMouseMove = (e) => {
            // Если фокус на поле пароля, глаза смотрят вверх
            if (isPasswordFocused) {
                if (eyesRef.current) {
                    eyesRef.current.style.setProperty('--pupil-x', '0%');
                    eyesRef.current.style.setProperty('--pupil-y', '-50%');
                }
                return;
            }
            
            // Проверяем есть ли активный элемент ввода кроме пароля
            const activeElement = document.activeElement;
            const isInputActive = activeElement && 
                                 activeElement.tagName.toLowerCase() === 'input' && 
                                 activeElement.type !== 'password';
            
            // Если активно какое-то другое поле ввода, не обрабатываем движение мыши
            if (isInputActive) return;
            
            const eyesRect = eyesRef.current.getBoundingClientRect();
            const eyesCenterX = eyesRect.left + (eyesRect.width / 2);
            const eyesCenterY = eyesRect.top + (eyesRect.height / 2);
            
            const deltaX = e.clientX - eyesCenterX;
            const deltaY = e.clientY - eyesCenterY;
            
            const angle = Math.atan2(deltaY, deltaX);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 300;
            const maxOffset = 25;
            
            const factor = Math.min(distance / maxDistance, 1);
            const offsetX = Math.cos(angle) * maxOffset * factor;
            const offsetY = Math.sin(angle) * maxOffset * factor;
            
            if (eyesRef.current) {
                eyesRef.current.style.setProperty('--pupil-x', `${offsetX}%`);
                eyesRef.current.style.setProperty('--pupil-y', `${offsetY}%`);
            }
        };
        
        // Добавляем обработчики событий
        inputs.forEach(input => {
            events.forEach(event => input.addEventListener(event, handleInputEvent));
        });
        
        document.addEventListener('mousemove', handleMouseMove);
        
        // Добавляем обработчик выделения текста
        document.addEventListener('selectionchange', () => {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName.toLowerCase() === 'input') {
                updateEyePosition(activeElement);
            }
        });
        
        return () => {
            inputs.forEach(input => {
                events.forEach(event => input.removeEventListener(event, handleInputEvent));
            });
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('selectionchange', () => {});
        };
    }, [isPasswordFocused]);

    return (
        <div className="login-page">
            <div className="login-container">
                <h2>Вход</h2>
                <div className="eyes-container" 
                     ref={eyesRef}
                     style={{ 
                         opacity: isPasswordFocused ? 0.7 : 1
                     }}>
                    <div className="eye">
                        <div className="pupil"></div>
                    </div>
                    <div className="eye">
                        <div className="pupil"></div>
                    </div>
                </div>
                {message && <div className="message">{message}</div>}
                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label htmlFor="username">Имя пользователя</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            onFocus={() => {
                                setIsPasswordFocused(true);
                            }}
                            onBlur={() => {
                                setIsPasswordFocused(false);
                            }}
                            ref={passwordRef}
                        />
                    </div>
                    <button type="submit" className="submit-button">Войти</button>
                </form>
                <p className="hint-text">
                    Или войдите через Google:
                    <br />
                    <a href="http://localhost:8000/api/login/google" className="google-link">Войти с Google</a>
                </p>
            </div>
        </div>
    );
};

export default Login;