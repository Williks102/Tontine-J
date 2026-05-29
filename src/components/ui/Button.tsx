import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'gold' | 'ghost';
  icon?: any;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary', 
  disabled = false, 
  icon: Icon,
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer";
  const variants: Record<string, string> = {
    primary: "bg-[#3B0764] text-white hover:bg-[#2C054D] active:bg-[#1E0336] shadow-[#3B0764]/10",
    secondary: "bg-amber-400 text-[#3B0764] hover:bg-amber-500 active:bg-amber-600 shadow-amber-400/15",
    gold: "bg-amber-400 text-[#3B0764] hover:bg-amber-500 active:bg-[#1E0336] shadow-amber-400/10",
    ghost: "bg-transparent text-[#3B0764] hover:bg-gray-50 active:bg-gray-100 border border-gray-100 shadow-none"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`} 
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2.5} />}
      {children}
    </button>
  );
};
