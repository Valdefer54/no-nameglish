import type { getVocabularyProgressAction } from "@/actions/progress";
import { Progress } from "@/components/ui/progress";

export function VocabularyProgress({ progress }: { progress: Awaited<ReturnType<typeof getVocabularyProgressAction>> }) {
  const currentIndex = progress.studyLevel === "advanced" ? 3 : progress.levels.findIndex((level) => level.level === progress.currentLevel);
  return <section lang="es" aria-labelledby="vocabulary-progress" className="rounded-xl border p-5 space-y-4">
    <div>
      <h2 id="vocabulary-progress" className="font-semibold">Tu recorrido de vocabulario</h2>
      <p className="mt-1 text-sm text-muted-foreground">Estudia todas las palabras y consigue un 80 % de madurez para avanzar al siguiente nivel.</p>
    </div>
    <ol className="grid gap-5 sm:grid-cols-3">
      {progress.levels.map((level, index) => <li key={level.level} className="space-y-2" aria-current={index === currentIndex ? "step" : undefined}>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold">{level.level}</span>
          <span className={index === currentIndex ? "text-primary font-medium" : "text-muted-foreground"}>{index < currentIndex ? "Completado" : index === currentIndex ? "En curso" : "Bloqueado"}</span>
        </div>
        <Progress value={level.mature / level.total * 100} aria-label={`Madurez del vocabulario ${level.level}`} className="h-1.5" />
        <p className="text-xs text-muted-foreground tabular-nums">{level.studied}/{level.total} estudiadas · {level.mature}/{level.total} maduras</p>
      </li>)}
    </ol>
    <p className="text-xs text-muted-foreground">Una palabra madura tiene al menos 5 repasos y una estabilidad superior a 21 días. Al terminar B1, pasas a B2–C1 sin perder tus repasos.</p>
    {progress.currentLevel === "B1" && progress.levels[2].complete && !progress.complete && <p className="text-sm">B1 completado. Repasa los niveles anteriores hasta alcanzar {Math.ceil(progress.total * 0.8)} palabras maduras de {progress.total} para pasar a B2–C1.</p>}
  </section>;
}
