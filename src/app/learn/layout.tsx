
"use client"

import { Suspense } from "react";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-background relative overflow-hidden">
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground italic animate-pulse">Initializing ScholaIuris Curriculum...</div>}>
        {children}
      </Suspense>
    </div>
  );
}
