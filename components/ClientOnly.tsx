"use client";
import React, { useState, useEffect } from "react";

interface ClientOnlyProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function ClientOnly({ fallback = null, children }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by ensuring server and client render the same initially
  if (!mounted) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
