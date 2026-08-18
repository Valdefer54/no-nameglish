interface ReviewRow {
  review: {
    id: number;
    rating: number;
    responseTimeMs: number;
  };
  card: {
    id: number;
    targetChunk: string;
    [key: string]: unknown;
  };
  isWorst: boolean;
}

interface Props {
  reviews: ReviewRow[];
}

const RATING_INFO: Record<number, { label: string; color: string }> = {
  1: { label: "Again", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  2: { label: "Hard", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  3: { label: "Good", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  4: { label: "Easy", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
};

export function SessionSummary({ reviews }: Props) {
  const againCount = reviews.filter((r) => r.review.rating === 1).length;
  const hardCount = reviews.filter((r) => r.review.rating === 2).length;
  const goodCount = reviews.filter((r) => r.review.rating === 3).length;
  const easyCount = reviews.filter((r) => r.review.rating === 4).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 text-sm">
        <h2 className="text-xl font-semibold">{reviews.length} cards reviewed</h2>
        <div className="flex gap-3 text-xs">
          {againCount > 0 && <span className="text-red-600">{againCount} Again</span>}
          {hardCount > 0 && <span className="text-orange-600">{hardCount} Hard</span>}
          {goodCount > 0 && <span className="text-green-600">{goodCount} Good</span>}
          {easyCount > 0 && <span className="text-blue-600">{easyCount} Easy</span>}
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {reviews.map((r) => {
          const info = RATING_INFO[r.review.rating];
          const secs = Math.round(r.review.responseTimeMs / 1000);
          return (
            <div
              key={r.review.id}
              className={`flex items-center justify-between px-4 py-3 gap-3 ${r.isWorst ? "bg-red-50 dark:bg-red-950/20" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.isWorst && (
                  <span className="text-xs text-red-500 font-semibold shrink-0">WORST</span>
                )}
                <span className="font-medium truncate">{r.card.targetChunk}</span>
                <span className="text-xs text-muted-foreground shrink-0">{secs}s</span>
              </div>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.color}`}>
                {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
