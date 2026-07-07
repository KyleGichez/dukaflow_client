import axios from "axios";

// 1. Bulletproof check looking for your exact custom preload key or native Electron environment
const isElectron = typeof window !== 'undefined' && (
  !!window.electronAPI ||                                    // ◄ Detects your custom preload script object
  !!window.__electron_preload__ || 
  navigator.userAgent.toLowerCase().includes('electron') ||
  window.location.protocol === 'file:' ||                    // ◄ True when running from an app.asar bundle
  process?.versions?.hasOwnProperty('electron')
);

// Detect if you're previewing the app via local web browser dev tools
const isLocalBrowser = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// 2. Dynamic Routing (Electron, Local Web Testing, and Live Production)
const API_BASE_URL = (isElectron || isLocalBrowser) 
  ? 'http://127.0.0.1:5000/api' // Route to local working SQLite/Express engine
  : 'https://dukaflow-server.onrender.com/api'; // Live Render cloud layer

console.log(`[DukaFlow] Environment detected: ${isElectron ? 'Electron/Desktop' : isLocalBrowser ? 'Local Browser Dev' : 'Web/Cloud'}`);
console.log(`[DukaFlow] Routing API to: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, 
  timeout: 6000, // Safety timeout to prevent infinite skeleton loading if local backend is booting up
});

// Request interceptor to add the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle expired sessions
// 🍕 FIXED: Attached directly to 'api' instead of global 'axios'
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If there's no response object, the server couldn't be reached (User is offline)
    if (!error.response) {
      console.log("Network error detected. Postponing online authentication checks.");
      return Promise.reject(error);
    }

    // 💡 THE SAFETY FIX: Log exactly what endpoint failed before kicking out
    console.warn(`[DukaFlow Interceptor] Caught ${error.response.status} from path: ${error.config.url}`);

    // Only redirect to login if the backend explicitly says 401 Unauthorized
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 🍕 FIXED: Cleaned up trailing conflicting duplicate exports
export const API_URL = API_BASE_URL.replace('/api', ''); 
export default api;