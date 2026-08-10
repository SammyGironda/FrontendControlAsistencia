import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // No deslogueamos/redirigimos si el 401 viene del propio intento de
    // login: eso es "usuario o contraseña incorrectos", no una sesión
    // vencida, y Login.jsx ya maneja ese error mostrando un mensaje inline.
    const isLoginRequest = error.config?.url?.includes('/api/v1/auth/login');
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      toast.error('Tu sesión no es válida o expiró. Inicia sesión nuevamente.');
      useAuthStore.getState().logout();
      // Redirect to login page - assuming react-router-dom is used
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
