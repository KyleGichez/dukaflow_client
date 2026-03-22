import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Helper function to register SW safely
const registerSW = () => {
  if ("serviceWorker" in navigator) {
    const handleRegister = () => {
      // Use a small timeout to let React finish its initial paint
      setTimeout(() => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("DukaFlow SW Registered: ", registration.scope);
          })
          .catch((err) => {
            console.error("SW Registration failed: ", err);
          });
      }, 1000); 
    };

    // If the window is already loaded, register immediately
    if (document.readyState === "complete") {
      handleRegister();
    } else {
      window.addEventListener("load", handleRegister);
    }
  }
};

// Fire the registration
registerSW();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
