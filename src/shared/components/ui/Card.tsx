import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", hoverable = false, className, children, ...props }, ref) => {
    const variants = {
      default: "bg-white rounded-2xl shadow-sm border border-gray-100",
      bordered: "bg-white rounded-2xl border-2 border-gray-200",
      elevated: "bg-white rounded-2xl shadow-lg",
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          "transition-all duration-200",
          hoverable && "hover:shadow-md cursor-pointer hover:border-gray-300",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card Header
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4 border-b border-gray-100", className)}
      {...props}
    />
  )
);

CardHeader.displayName = "CardHeader";

// Card Content
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4", className)}
      {...props}
    />
  )
);

CardContent.displayName = "CardContent";

// Card Footer
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl", className)}
      {...props}
    />
  )
);

CardFooter.displayName = "CardFooter";
