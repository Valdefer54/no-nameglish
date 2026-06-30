import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_LABELS, type DeckStats } from "@/types";

interface Props {
  stats: DeckStats;
  detailed?: boolean;
}

export function DeckCard({ stats, detailed = false }: Props) {
  const maturityPct =
    stats.totalActive > 0
      ? Math.round((stats.matureCount / stats.totalActive) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{CATEGORY_LABELS[stats.category]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Due now</span>
          <span className={`font-semibold ${stats.dueCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
            {stats.dueCount}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Maturity</span>
            <span>{maturityPct}%</span>
          </div>
          <Progress value={maturityPct} className="h-1.5" />
        </div>
        {detailed && (
          <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1 border-t">
            <div>
              <div className="font-semibold text-base">{stats.newCount}</div>
              <div className="text-muted-foreground">New</div>
            </div>
            <div>
              <div className="font-semibold text-base">{stats.learningCount}</div>
              <div className="text-muted-foreground">Learning</div>
            </div>
            <div>
              <div className="font-semibold text-base">{stats.matureCount}</div>
              <div className="text-muted-foreground">Mature</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
