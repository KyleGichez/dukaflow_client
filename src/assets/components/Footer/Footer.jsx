import React from "react";
import '../../styles/Footer.css';

const Footer = () => {

  function getCurrentYear() {
    return new Date().getFullYear();
  }

  return (
    <div className="footer-wrapper">
      <div className="footer-content flex justify-between">
        <p>
          Copyright &copy; <span>{getCurrentYear()}</span> All Rights Reserved. 
        </p>
        <p>
          Developed by
           <a className="text-blue-600 underline mx-1" href="https://gichezdman.netlify.app" target="_blank">Gichure Maina</a>
        </p>
      </div>
    </div>
  );
};

export default Footer;
