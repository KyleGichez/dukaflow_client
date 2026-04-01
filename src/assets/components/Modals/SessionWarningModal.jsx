const SessionWarningModal = ({ onStayLoggedIn, onLogout }) => {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>Session Expiring</h2>
          <p>You will be logged out in 1 minute due to inactivity.</p>
  
          <div style={styles.actions}>
            <button onClick={onStayLoggedIn} style={styles.stayBtn}>
              Stay Logged In
            </button>
            <button onClick={onLogout} style={styles.logoutBtn}>
              Logout Now
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    modal: {
      background: "#fff",
      padding: "20px",
      borderRadius: "10px",
      width: "300px",
      textAlign: "center",
    },
    actions: {
      marginTop: "15px",
      display: "flex",
      justifyContent: "space-between",
    },
    stayBtn: {
      background: "green",
      color: "#fff",
      padding: "8px 12px",
      border: "none",
    },
    logoutBtn: {
      background: "red",
      color: "#fff",
      padding: "8px 12px",
      border: "none",
    },
  };
  
  export default SessionWarningModal;