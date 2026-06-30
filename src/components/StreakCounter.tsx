interface Props {
  streak: number;
}

export function StreakCounter({ streak }: Props) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl font-bold">{streak}</span>
      <span className="text-xs text-muted-foreground mt-0.5">
        {streak === 1 ? "day streak" : "day streak"}
      </span>
    </div>
  );
}
