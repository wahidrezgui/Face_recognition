"use client";
import { memo, useState, useEffect } from "react";

interface LiveClockProps {
  mode?: "date" | "time" | "datetime";
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
  transform?: (s: string) => string;
}

export const LiveClock = memo(function LiveClock({
  mode = "time",
  locale = "en-US",
  options,
  className,
  transform,
}: LiveClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const text =
    mode === "date"
      ? now.toLocaleDateString(locale, options)
      : mode === "datetime"
        ? now.toLocaleString(locale, options)
        : now.toLocaleTimeString(locale, options);

  return (
    <span className={className} suppressHydrationWarning>
      {transform ? transform(text) : text}
    </span>
  );
});
