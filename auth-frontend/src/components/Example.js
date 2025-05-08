import React, { useEffect, useState } from 'react';
import axiosInstance from '../services/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import './Example.css';

const Example = () => {
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
            navigate('/example');
        }
    }, [location, navigate]);

    const fetchExample = async () => {
        try {
            const response = await axiosInstance.get('/example');
            setMessage(`${response.data.message}, ${response.data.user_info.username}, ${response.data.user_info.bank_balance}`);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setMessage('Токен истек. Пожалуйста, войдите в систему.');
                navigate('/login');
            } else {
                setMessage(error.response?.data?.detail || 'Не удалось получить пример');
            }
        }
    };

    return (
        <div className="example-page">
            <div className="example-container">
                <h2>Пример</h2>
                {message && <div className="message">{message}</div>}
                <button onClick={fetchExample} className="fetch-button">Получить пример</button>
            </div>
        </div>
    );
};

export default Example;