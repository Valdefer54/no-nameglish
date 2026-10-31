import { acknowledgeGraduationAction } from "@/actions/progress";
import { Button } from "@/components/ui/button";

export function GraduationNotice() {
  return <section lang="es" role="status" aria-labelledby="graduation-title" className="mx-auto mt-6 max-w-4xl px-4">
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 space-y-2">
        <h2 id="graduation-title" className="text-xl font-semibold">¡Felicitaciones! Completaste el vocabulario A1–B1</h2>
        <p className="text-sm">Estudiaste las 300 palabras y al menos el 80 % están maduras. Ya desbloqueaste B2–C1. Tu progreso y los repasos anteriores se conservan.</p>
      </div>
      <form action={acknowledgeGraduationAction}>
        <Button type="submit" className="min-h-11 w-full sm:w-auto">Continuar con B2–C1</Button>
      </form>
    </div>
  </section>;
}
