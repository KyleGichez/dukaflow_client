import axios from 'axios';

const api = axios.create({
  baseURL: 'https://dukaflow-server.onrender.com/api', // Use your actual backend URL
  credentials: true,
});

// Request interceptor to add the token
// api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log("Interceptor Token:", token); // Check if this prints null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 401) {
//       // Token is invalid or expired
//       localStorage.removeItem('user');
//       window.location.href = '/login'; 
//     }
//     return Promise.reject(error);
//   }
// );

export default api;