import React from 'react';
import '../../../styles/common.css';

/**
 * Universal button component, can be reused throughout the application
 */
export const Button = ({ 
  children, 
  type = 'button', 
  variant = 'primary', 
  size = 'medium',
  fullWidth = false,
  onClick,
  disabled = false,
  className = '',
  ...rest 
}) => {
  const buttonClass = `btn btn-${variant} btn-${size}`;
  
  return (
    <button
      type={type}
      className={`${buttonClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button; 