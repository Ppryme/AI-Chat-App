import type { ButtonHTMLAttributes, ReactNode } from 'react';



interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'primary' | 'ghost';
}

export default function IconButton({ icon, variant = 'ghost', className = '', ...props }: IconButtonProps) {
  const baseClasses = "p-2 rounded-full transition-all flex items-center justify-center cursor-pointer";
  const variants = {
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
    primary: "bg-slate-100 hover:bg-white text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 shadow"
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
