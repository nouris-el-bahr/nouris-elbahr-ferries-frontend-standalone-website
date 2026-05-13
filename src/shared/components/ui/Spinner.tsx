import React from "react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  text?: string;
}

const sizeClasses: Record<SpinnerSize, { container: string; spinner: string }> = {
  sm: {
    container: "w-6 h-6",
    spinner: "border-2",
  },
  md: {
    container: "w-8 h-8",
    spinner: "border-3",
  },
  lg: {
    container: "w-12 h-12",
    spinner: "border-4",
  },
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = "md", text, className, ...props }, ref) => {
    const styles = sizeClasses[size];

    return (
      <div
        ref={ref}
        className="flex flex-col items-center justify-center gap-3"
        {...props}
      >
        <div className={cn(styles.container, "relative")}>
          <div
            className={cn(
              styles.spinner,
              "rounded-full border-gray-200 border-t-nouris animate-spin"
            )}
            style={{
              width: "100%",
              height: "100%",
              borderTopColor: "currentColor",
            }}
          />
        </div>
        {text && (
          <p className="text-sm text-gray-600">{text}</p>
        )}
      </div>
    );
  }
);

Spinner.displayName = "Spinner";
