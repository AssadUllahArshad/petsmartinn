"use client";
import { useEffect, useRef } from "react";
export function FilterPanel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const update = () => {
      if (ref.current) ref.current.open = desktop.matches;
    };
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);
  return (
    <details ref={ref} className="filter-panel">
      {children}
    </details>
  );
}
