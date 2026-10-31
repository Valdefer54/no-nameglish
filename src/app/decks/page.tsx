import { requireUser } from "@/lib/current-user";
import { getDeckStatsAction } from "@/actions/decks";
import { DeckCard } from "@/components/DeckCard";
import { AddSentenceModal } from "@/components/AddSentenceModal";
import { getVocabularyProgressAction } from "@/actions/progress";
import { VocabularyProgress } from "@/components/VocabularyProgress";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const user = await requireUser();
  const stats = await getDeckStatsAction();
  const progress = user.studyLevel === "beginner" ? await getVocabularyProgressAction() : null;
  const totalActive = stats.reduce((s, d) => s + d.totalActive, 0);
  const totalMature = stats.reduce((s, d) => s + d.matureCount, 0);
  const totalDue = stats.reduce((s, d) => s + d.dueCount, 0);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Your Decks</h1>
          <p className="text-muted-foreground mt-1">
            {totalActive} active cards · {totalMature} mature · {totalDue} due
          </p>
        </div>
        <AddSentenceModal beginner={user.studyLevel === "beginner"} triggerLabel="Add New Sentence" />
      </div>
      {progress && <VocabularyProgress progress={progress} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <DeckCard key={s.category} stats={s} detailed />
        ))}
      </div>
    </div>
  );
}
