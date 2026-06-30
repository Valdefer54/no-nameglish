"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  className?: string;
}

export function Timer({ className }: TimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <span className={`font-mono tabular-nums text-muted-foreground ${className ?? ""}`}>
      {mm}:{ss}
    </span>
  );
}
