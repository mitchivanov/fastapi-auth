import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { register } from '../services/auth';
import './Register.css';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const eyesRef = useRef(null);
    // Добавляем состояние для серверных ошибок
    const [serverErrors, setServerErrors] = useState({});

    const formik = useFormik({
        initialValues: {
            username: '',
            password: '',
            email: '',
            date_of_birth: ''
        },
        validationSchema: Yup.object({
            username: Yup.string()
                .min(3, 'Должно быть не менее 3 символов')
                .required('Обязательное поле'),
            password: Yup.string()
                .min(8, 'Должно быть не менее 8 символов')
                .required('Обязательное поле'),
            email: Yup.string()
                .email('Неверный формат email')
                .required('Обязательное поле'),
            date_of_birth: Yup.date()
                .max(new Date(), 'Дата рождения не может быть в будущем')
                .required('Обязательное поле')
        }),
        onSubmit: async (values, { setSubmitting, setStatus }) => {
            try {
                // Сбрасываем предыдущие ошибки
                setServerErrors({});
                
                await register(values.username, values.password, values.email, values.date_of_birth);
                setStatus({ success: 'Регистрация успешно завершена!' });
                navigate('/login');
            } catch (error) {
                // Обработка ошибок валидации
                if (error.validationErrors) {
                    setServerErrors(error.validationErrors);
                } else {
                    // Обработка общей ошибки
                    setStatus({ error: error.message || 'Ошибка регистрации' });
                }
            }
            setSubmitting(false);
        },
    });

    // Функция для отслеживания движения глаз
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
        
        // Расчет смещения зрачков
        const maxOffset = 25;
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 300;
        
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
        
        // Привязываем обработчики событий
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        formik.handleChange(e);
        updateEyePosition(e.target);
        
        if (name === 'password') {
            setIsPasswordFocused(true);
        } else {
            setIsPasswordFocused(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <h2>Регистрация</h2>
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
                {formik.status && formik.status.success && <div className="success-message">{formik.status.success}</div>}
                {formik.status && formik.status.error && <div className="error-message">{formik.status.error}</div>}
                <form onSubmit={formik.handleSubmit} className="form">
                    <div className="form-group">
                        <label htmlFor="username">Имя пользователя</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Username"
                            onChange={handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.username}
                            required
                        />
                        {formik.touched.username && formik.errors.username ? (
                            <div className="error">{formik.errors.username}</div>
                        ) : serverErrors.username ? (
                            <div className="error">{serverErrors.username}</div>
                        ) : null}
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Password"
                            onChange={handleChange}
                            onFocus={() => {
                                setIsPasswordFocused(true);
                            }}
                            onBlur={(e) => {
                                formik.handleBlur(e);
                                setIsPasswordFocused(false);
                            }}
                            value={formik.values.password}
                            required
                        />
                        {formik.touched.password && formik.errors.password ? (
                            <div className="error">{formik.errors.password}</div>
                        ) : serverErrors.password ? (
                            <div className="error">{serverErrors.password}</div>
                        ) : null}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Email"
                            onChange={handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.email}
                            required
                        />
                        {formik.touched.email && formik.errors.email ? (
                            <div className="error">{formik.errors.email}</div>
                        ) : serverErrors.email ? (
                            <div className="error">{serverErrors.email}</div>
                        ) : null}
                    </div>
                    <div className="form-group">
                        <label htmlFor="date_of_birth">Дата рождения</label>
                        <input
                            type="date"
                            id="date_of_birth"
                            name="date_of_birth"
                            onChange={handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.date_of_birth}
                            required
                        />
                        {formik.touched.date_of_birth && formik.errors.date_of_birth ? (
                            <div className="error">{formik.errors.date_of_birth}</div>
                        ) : serverErrors.date_of_birth ? (
                            <div className="error">{serverErrors.date_of_birth}</div>
                        ) : null}
                    </div>
                    <button 
                        type="submit" 
                        disabled={formik.isSubmitting}
                        className={formik.isSubmitting ? 'button-submitting' : ''}
                    >
                        {formik.isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;