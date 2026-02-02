import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function CyberButton({ 
  children, 
  variant = "primary", 
  size = "md", 
  className,
  isLoading,
  disabled,
  ...props 
}: CyberButtonProps) {
  
  const baseStyles = "relative overflow-hidden font-mono uppercase tracking-wider font-bold transition-all duration-200 border flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-primary/10 border-primary text-primary hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]",
    secondary: "bg-secondary/30 border-secondary text-foreground hover:bg-secondary/50",
    danger: "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]",
    ghost: "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 rounded-sm",
    md: "text-sm px-5 py-2.5 rounded-md",
    lg: "text-base px-8 py-3 rounded-lg"
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled || isLoading}
      className={twMerge(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      {variant !== 'ghost' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:animate-[shimmer_1s_infinite]" />
      )}
    </motion.button>
  );
}
