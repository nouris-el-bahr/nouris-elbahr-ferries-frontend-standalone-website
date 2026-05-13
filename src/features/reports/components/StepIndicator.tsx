"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  label: string;
  completed?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  className,
}) => {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.completed || step.number < currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200",
                    isActive && "bg-nouris text-white shadow-md ring-4 ring-nouris/20",
                    isCompleted && !isActive && "bg-green-500 text-white",
                    !isActive && !isCompleted && "bg-gray-200 text-gray-600"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium text-center",
                    isActive && "text-nouris font-semibold",
                    isCompleted && !isActive && "text-green-600",
                    !isActive && !isCompleted && "text-gray-600"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2 rounded-full transition-all duration-200",
                    isCompleted ? "bg-green-500" : "bg-gray-300"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
