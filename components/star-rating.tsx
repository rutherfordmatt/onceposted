"use client";

import { useState, useEffect } from "react";

interface StarRatingProps {
  postcardId: string;
  compact?: boolean;
}

export function StarRating({ postcardId, compact = false }: StarRatingProps) {
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/postcards/${postcardId}/rating`)
      .then((res) => res.json())
      .then((data) => {
        setAverage(data.average || 0);
        setCount(data.count || 0);
      })
      .catch(() => {});
  }, [postcardId]);

  const submitRating = async (value: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/postcards/${postcardId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      const data = await res.json();
      setAverage(data.average || 0);
      setCount(data.count || 0);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const starSize = compact ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      className="inline-flex items-center gap-0.5"
      data-testid={`rating-stars-${postcardId}`}
      onMouseLeave={() => setHoverIndex(-1)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hoverIndex >= 0 ? star <= hoverIndex + 1 : star <= Math.round(average);
        return (
          <button
            key={star}
            type="button"
            className={`${starSize} transition-all duration-150 cursor-pointer hover:scale-125 focus:outline-none`}
            onMouseEnter={() => setHoverIndex(star - 1)}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              submitRating(star);
            }}
            data-testid={`star-${star}-${postcardId}`}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? "#f59e0b" : "rgba(160,160,160,0.3)"}
                stroke={filled ? "#d97706" : "rgba(160,160,160,0.5)"}
                strokeWidth="1.5"
                className="transition-colors duration-150"
              />
            </svg>
          </button>
        );
      })}
      {count > 0 && !compact && (
        <span className="text-[10px] text-muted-foreground ml-1 tabular-nums font-medium" data-testid={`rating-count-${postcardId}`}>
          {average.toFixed(1)}
        </span>
      )}
    </div>
  );
}
