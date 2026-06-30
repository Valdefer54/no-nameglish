"use client";

import { Button } from "@/components/ui/button";
import type { Rating } from "@/types";

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

const RATINGS: Array<{ value: Rating; label: string; className: string }> = [
  { value: 1, label: "Again", className: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: 2, label: "Hard", className: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" },
  { value: 3, label: "Good", className: "bg-green-500 hover:bg-green-600 text-white border-green-500" },
  { value: 4, label: "Easy", className: "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" },
];

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {RATINGS.map((r) => (
        <Button
          key={r.value}
          className={`flex-1 min-w-[80px] ${r.className}`}
          onClick={() => onRate(r.value)}
          disabled={disabled}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
