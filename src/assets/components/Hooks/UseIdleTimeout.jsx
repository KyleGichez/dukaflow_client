import { useEffect, useRef, useState } from "react";

const useIdleTimeout = ({
  onLogout,
  warningTime = 29 * 60 * 1000, // 29 min
  timeout = 30 * 60 * 1000,     // 30 min
}) => {
  const [showWarning, setShowWarning] = useState(false);

  const warningTimer = useRef(null);
  const logoutTimer = useRef(null);

  const clearTimers = () => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  };

  const startTimers = () => {
    clearTimers();

    // Show warning at 29 min
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, warningTime);

    // Logout at 30 min
    logoutTimer.current = setTimeout(() => {
      setShowWarning(false);
      onLogout();
    }, timeout);
  };

  const resetTimers = () => {
    setShowWarning(false);
    startTimers();
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];

    const handleActivity = () => {
      resetTimers();
    };

    events.forEach(event =>
      window.addEventListener(event, handleActivity)
    );

    startTimers();

    return () => {
      clearTimers();
      events.forEach(event =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, []);

  return { showWarning, resetTimers };
};

export default useIdleTimeout;