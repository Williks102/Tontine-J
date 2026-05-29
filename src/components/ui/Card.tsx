import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => {
  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border-');
  return (
    <div 
      onClick={onClick}
      className={`${hasBg ? '' : 'bg-white'} ${hasBorder ? '' : 'border border-gray-100'} rounded-2xl shadow-sm p-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
