import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  count?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, circle = false, count = 1, className, ...props }, ref) => {
    const style: React.CSSProperties = {
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    };

    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            ref={ref}
            className={cn(
              "bg-gray-200 animate-pulse",
              circle && "rounded-full",
              !circle && "rounded-lg",
              className
            )}
            style={style}
            {...props}
          />
        ))}
      </>
    );
  }
);

Skeleton.displayName = "Skeleton";

// Skeleton components for common patterns
export const SkeletonText = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className="space-y-2">
      <Skeleton ref={ref} height={16} className={cn("w-full", className)} {...props} />
    </div>
  )
);

SkeletonText.displayName = "SkeletonText";

export const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border border-gray-200 p-6", className)} {...props}>
      <Skeleton height={24} className="w-3/4 mb-4" />
      <Skeleton height={16} className="w-full mb-2" />
      <Skeleton height={16} className="w-5/6 mb-4" />
      <Skeleton height={40} className="w-full mt-6" />
    </div>
  )
);

SkeletonCard.displayName = "SkeletonCard";

export const SkeletonAvatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Skeleton ref={ref} width={40} height={40} circle className={className} {...props} />
  )
);

SkeletonAvatar.displayName = "SkeletonAvatar";
