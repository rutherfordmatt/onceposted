"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "onceposted:weekly-notice-dismissed";

export function WeeklyNotice() {
  // Hidden until we've checked storage, so it never flashes for visitors who dismissed it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage unavailable (e.g. private mode): hide for this visit only.
    }
  };

  if (!visible) return null;

  return (
    <div
      className="px-6 mb-5 flex items-center justify-center gap-2 text-[11px] font-light tracking-widest uppercase text-muted-foreground animate-in fade-in duration-700"
      role="status"
      data-testid="notice-weekly"
    >
      <span>New postcards uploaded every week</span>
      <button
        type="button"
        onClick={dismiss}
        className="p-1 rounded-sm opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
        aria-label="Dismiss"
        data-testid="button-dismiss-weekly-notice"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
