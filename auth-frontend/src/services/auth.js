import axios from 'axios';
import Cookies from 'js-cookie'; // Установите библиотеку `js-cookie`

const API_URL = 'http://localhost:8000/api';

// Настройка Axios для отправки куки
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true // Отправка куки
});

// Переменная для хранения CSRF-токена
let csrfToken = '';

// Получение CSRF-токена
export const getCSRFToken = async () => {
  try {
    const response = await axios.get(`${API_URL}/get_csrf_token`, { withCredentials: true });
    csrfToken = response.data.csrf_token;
    // Установка CSRF-токена в заголовки по умолчанию
    axiosInstance.defaults.headers.common['X-CSRF-Token'] = csrfToken;
  } catch (error) {
    console.error("Ошибка при получении CSRF-токена:", error);
  }
};

// Интерцептор для добавления CSRF-токена в заголовки (если не установлен по умолчанию)
axiosInstance.interceptors.request.use(
  (config) => {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axiosInstance.post('/refresh');
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const register = async (username, password, email, date_of_birth) => {
    try {
        const response = await axiosInstance.post('/register', {
            username,
            password,
            email,
            date_of_birth
        });
        return response.data;
    } catch (error) {
        // Обработка ошибок валидации в новом формате
        if (error.response && error.response.data && error.response.data.errors) {
            throw { 
                validationErrors: error.response.data.errors,
                message: "Ошибка валидации данных" 
            };
        } 
        // Обработка других ошибок
        else if (error.response && error.response.data) {
            throw { 
                message: error.response.data.detail || "Ошибка регистрации" 
            };
        }
        // Общая ошибка
        throw { message: "Ошибка соединения с сервером" };
    }
};

export const login = async (username, password) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  // Убедитесь, что CSRF-токен получен перед отправкой запроса на логин
  if (!csrfToken) {
    await getCSRFToken();
  }

  // После успешного логина куки вернутся автоматически
  return axiosInstance.post('/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
};

export const refreshToken = async () => {
  // При использовании куки рефреш осуществляется автоматически
  return axiosInstance.post('/refresh');
};

export const checkAuth = async () => {
  try {
    const response = await axiosInstance.get('/check_auth');
    return response.data.authenticated;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        // Пробуем обновить токен
        await axiosInstance.post('/refresh');
        const retryResponse = await axiosInstance.get('/check_auth');
        return retryResponse.data.authenticated;
      } catch (refreshError) {
        return false;
      }
    }
    return false;
  }
};

export default axiosInstance;