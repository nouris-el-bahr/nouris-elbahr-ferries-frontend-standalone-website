"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ items, defaultValue, onValueChange, className }, ref) => {
    const [activeTab, setActiveTab] = useState(defaultValue || items[0]?.id);

    const handleTabChange = (id: string) => {
      setActiveTab(id);
      onValueChange?.(id);
    };

    return (
      <div ref={ref} className={className}>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              disabled={item.disabled}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 relative",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                activeTab === item.id
                  ? "bg-nouris-navy text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {item.label}
              {item.badge !== undefined && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-white/20">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

Tabs.displayName = "Tabs";

// Tab Content Component
interface TabsContentProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  activeValue,
  children,
  className,
}) => {
  if (value !== activeValue) return null;

  return (
    <div className={cn("animate-fadeIn", className)}>
      {children}
    </div>
  );
};

TabsContent.displayName = "TabsContent";
