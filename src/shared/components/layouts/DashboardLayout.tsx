"use client";

import Sidebar from "@/components/Sidebar";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
}

export function DashboardLayout({
  children,
  header,
  sidebar,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebar || <Sidebar />}
      <main className="flex-1 overflow-auto">
        {header && <header className="sticky top-0 z-40 bg-white border-b border-gray-100">{header}</header>}
        {children}
      </main>
    </div>
  );
}
