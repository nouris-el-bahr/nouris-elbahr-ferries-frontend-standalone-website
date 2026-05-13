import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "w-full",
} as const;

export function PageContainer({
  children,
  className,
  maxWidth = "lg",
}: PageContainerProps) {
  return (
    <div className={cn("px-8 py-8", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}
