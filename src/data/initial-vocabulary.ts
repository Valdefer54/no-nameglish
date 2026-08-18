import type { InsertCard } from "@/lib/db/schema";

export type SeedCard = Omit<InsertCard, "id" | "createdAt">;

interface RawVocabItem {
  word: string;
  definition: string;
  exampleSentence: string;
  translationHint: string | null;
  category: string;
}

const RAW_VOCABULARY: RawVocabItem[] = [
  // ── DEBATE CONNECTORS (20) ──────────────────────────────────────────────
  { word: "however", definition: "Used to introduce a contrast with what was just said.", exampleSentence: "The plan was well-designed; however, the execution fell short.", translationHint: null, category: "debate-connectors" },
  { word: "nevertheless", definition: "In spite of that; despite what was just stated.", exampleSentence: "The task was difficult; nevertheless, she completed it on time.", translationHint: null, category: "debate-connectors" },
  { word: "consequently", definition: "As a direct result; therefore.", exampleSentence: "He missed the deadline; consequently, the entire project was delayed.", translationHint: null, category: "debate-connectors" },
  { word: "furthermore", definition: "In addition to what has been said; moreover.", exampleSentence: "The study was rigorous; furthermore, it drew on a diverse sample.", translationHint: null, category: "debate-connectors" },
  { word: "moreover", definition: "As a further matter; besides; in addition.", exampleSentence: "The evidence is compelling; moreover, it is corroborated by multiple studies.", translationHint: null, category: "debate-connectors" },
  { word: "nonetheless", definition: "In spite of that; used to acknowledge a point while maintaining a position.", exampleSentence: "The risks were acknowledged; nonetheless, the team decided to proceed.", translationHint: null, category: "debate-connectors" },
  { word: "therefore", definition: "For that reason; as a logical conclusion.", exampleSentence: "The data is incomplete; therefore, we cannot draw a firm conclusion.", translationHint: null, category: "debate-connectors" },
  { word: "subsequently", definition: "After that; in the time following a previous event.", exampleSentence: "The law was passed in April; subsequently, enforcement began in June.", translationHint: null, category: "debate-connectors" },
  { word: "conversely", definition: "On the other hand; introducing the opposite perspective.", exampleSentence: "Some argue for strict regulation; conversely, others advocate for open markets.", translationHint: null, category: "debate-connectors" },
  { word: "simultaneously", definition: "At exactly the same time.", exampleSentence: "The two processes occur simultaneously, making them difficult to isolate.", translationHint: null, category: "debate-connectors" },
  { word: "alternatively", definition: "As another option; offering a different possibility.", exampleSentence: "We can wait for more data; alternatively, we can proceed with current findings.", translationHint: null, category: "debate-connectors" },
  { word: "accordingly", definition: "In a way that is appropriate to what has been stated; as a result.", exampleSentence: "The evidence was weak; accordingly, the judge dismissed the case.", translationHint: null, category: "debate-connectors" },
  { word: "meanwhile", definition: "At the same time; in the intervening period.", exampleSentence: "The committee deliberated for hours; meanwhile, protesters gathered outside.", translationHint: null, category: "debate-connectors" },
  { word: "notwithstanding", definition: "In spite of; despite.", exampleSentence: "Notwithstanding the considerable challenges, the team delivered excellent results.", translationHint: null, category: "debate-connectors" },
  { word: "albeit", definition: "Although; even if; used to introduce a concession.", exampleSentence: "The solution proved effective, albeit considerably expensive.", translationHint: null, category: "debate-connectors" },
  { word: "henceforth", definition: "From this point in time onwards.", exampleSentence: "Henceforth, all submissions must be accompanied by supporting documentation.", translationHint: null, category: "debate-connectors" },
  { word: "in contrast", definition: "When compared with something noticeably different.", exampleSentence: "Northern regions are densely forested; in contrast, the south is largely arid.", translationHint: null, category: "debate-connectors" },
  { word: "by extension", definition: "As a logical consequence; taking the same reasoning a step further.", exampleSentence: "If we accept this premise, then by extension we must accept its corollaries.", translationHint: null, category: "debate-connectors" },
  { word: "provided that", definition: "On the condition that; only if.", exampleSentence: "The proposal will be approved, provided that all stakeholders sign off.", translationHint: null, category: "debate-connectors" },
  { word: "insofar as", definition: "To the extent that; as much as.", exampleSentence: "Insofar as the data allows, we can draw preliminary conclusions.", translationHint: null, category: "debate-connectors" },

  // ── PRECISION VERBS (20) ────────────────────────────────────────────────
  { word: "elucidate", definition: "To make something clear; to explain in detail.", exampleSentence: "The professor took care to elucidate the mechanism step by step.", translationHint: null, category: "precision-verbs" },
  { word: "substantiate", definition: "To provide evidence to support a claim; to prove.", exampleSentence: "The researcher needed additional data to substantiate her conclusions.", translationHint: null, category: "precision-verbs" },
  { word: "exemplify", definition: "To illustrate a point with an example; to be a typical example of.", exampleSentence: "This case perfectly exemplifies the problem with unregulated markets.", translationHint: null, category: "precision-verbs" },
  { word: "delineate", definition: "To describe or portray something precisely; to outline clearly.", exampleSentence: "The report delineates the responsibilities of each department.", translationHint: null, category: "precision-verbs" },
  { word: "corroborate", definition: "To confirm or give support to a statement or theory.", exampleSentence: "A second witness came forward to corroborate the original testimony.", translationHint: null, category: "precision-verbs" },
  { word: "articulate", definition: "To express thoughts, ideas, or feelings clearly and effectively.", exampleSentence: "She was able to articulate her concerns in a calm, professional manner.", translationHint: null, category: "precision-verbs" },
  { word: "ascertain", definition: "To find out something for certain; to determine definitively.", exampleSentence: "The investigators worked for weeks to ascertain the exact cause of the failure.", translationHint: null, category: "precision-verbs" },
  { word: "enumerate", definition: "To mention a number of things one by one.", exampleSentence: "The professor enumerated the key differences between the two competing theories.", translationHint: null, category: "precision-verbs" },
  { word: "scrutinize", definition: "To examine or inspect closely and critically.", exampleSentence: "The committee scrutinized every line of the proposed budget.", translationHint: null, category: "precision-verbs" },
  { word: "discern", definition: "To perceive or recognize something clearly.", exampleSentence: "It was difficult to discern the author's true intent from the text alone.", translationHint: null, category: "precision-verbs" },
  { word: "undermine", definition: "To weaken or damage something gradually and indirectly.", exampleSentence: "Repeated policy failures undermined public trust in the institution.", translationHint: null, category: "precision-verbs" },
  { word: "encapsulate", definition: "To summarize concisely; to express the essential features of.", exampleSentence: "The closing paragraph encapsulates the main argument of the entire essay.", translationHint: null, category: "precision-verbs" },
  { word: "reiterate", definition: "To say something again or a number of times for emphasis or clarity.", exampleSentence: "I want to reiterate that all contributions to this campaign are strictly voluntary.", translationHint: null, category: "precision-verbs" },
  { word: "differentiate", definition: "To recognize or identify what makes things different from each other.", exampleSentence: "The study attempts to differentiate between correlation and causation.", translationHint: null, category: "precision-verbs" },
  { word: "postulate", definition: "To suggest or assume something as a basis for reasoning or argument.", exampleSentence: "The economist postulated that consumer behavior would shift dramatically.", translationHint: null, category: "precision-verbs" },
  { word: "circumvent", definition: "To find a way around an obstacle, rule, or problem.", exampleSentence: "The company circumvented the regulation by restructuring its operations abroad.", translationHint: null, category: "precision-verbs" },
  { word: "mitigate", definition: "To make something less severe, serious, or painful.", exampleSentence: "Several measures were introduced to mitigate the environmental impact.", translationHint: null, category: "precision-verbs" },
  { word: "consolidate", definition: "To combine several things into a single, stronger whole.", exampleSentence: "The merger was designed to consolidate the two companies' resources and expertise.", translationHint: null, category: "precision-verbs" },
  { word: "extrapolate", definition: "To extend known data or trends into an area not yet known to make predictions.", exampleSentence: "Based on current trends, analysts extrapolate a 30% rise in demand by 2030.", translationHint: null, category: "precision-verbs" },
  { word: "contradict", definition: "To assert the opposite of a statement; to be inconsistent with.", exampleSentence: "The new findings directly contradict the original hypothesis.", translationHint: null, category: "precision-verbs" },

  // ── INTENSITY MODIFIERS (20) ────────────────────────────────────────────
  { word: "remarkably", definition: "To a degree that is worthy of note; surprisingly.", exampleSentence: "The patient made a remarkably swift recovery following the surgery.", translationHint: null, category: "intensity-modifiers" },
  { word: "profoundly", definition: "To a great depth of intensity or effect; deeply.", exampleSentence: "The experience profoundly affected his worldview for years to come.", translationHint: null, category: "intensity-modifiers" },
  { word: "substantially", definition: "To a great or significant extent; considerably.", exampleSentence: "The new process substantially reduced production costs.", translationHint: null, category: "intensity-modifiers" },
  { word: "considerably", definition: "Significantly; to a notable extent.", exampleSentence: "The cost of living has risen considerably over the past decade.", translationHint: null, category: "intensity-modifiers" },
  { word: "markedly", definition: "In a way that is clearly noticeable; significantly different.", exampleSentence: "The new treatment produced markedly better outcomes than the previous protocol.", translationHint: null, category: "intensity-modifiers" },
  { word: "predominantly", definition: "Mainly; for the most part; more than anything else.", exampleSentence: "The study was conducted predominantly in urban areas.", translationHint: null, category: "intensity-modifiers" },
  { word: "inherently", definition: "As a fundamental and natural quality; by its very nature.", exampleSentence: "The process is inherently complex, requiring specialized knowledge to manage.", translationHint: null, category: "intensity-modifiers" },
  { word: "increasingly", definition: "More and more; to a growing extent over time.", exampleSentence: "Automation is increasingly affecting employment in the manufacturing sector.", translationHint: null, category: "intensity-modifiers" },
  { word: "exceptionally", definition: "To an unusual degree; much more than usual.", exampleSentence: "She performed exceptionally well under the pressure of the final round.", translationHint: null, category: "intensity-modifiers" },
  { word: "overwhelmingly", definition: "To a very great degree; completely dominating in extent.", exampleSentence: "The evidence overwhelmingly supports the proposed causal relationship.", translationHint: null, category: "intensity-modifiers" },
  { word: "undeniably", definition: "In a way that cannot be denied or disputed; clearly.", exampleSentence: "The results are undeniably impressive, even by the most skeptical standards.", translationHint: null, category: "intensity-modifiers" },
  { word: "strikingly", definition: "In a way that strongly attracts attention through unusual qualities.", exampleSentence: "The two independent reports reached strikingly similar conclusions.", translationHint: null, category: "intensity-modifiers" },
  { word: "disproportionately", definition: "In a way that is too large or too small relative to something else.", exampleSentence: "The tax burden falls disproportionately on lower-income households.", translationHint: null, category: "intensity-modifiers" },
  { word: "explicitly", definition: "In a clear, detailed manner leaving nothing implied or unstated.", exampleSentence: "The contract explicitly prohibits any form of subletting without written approval.", translationHint: null, category: "intensity-modifiers" },
  { word: "fundamentally", definition: "At the most basic or important level; in essence.", exampleSentence: "The two approaches are fundamentally different in their underlying assumptions.", translationHint: null, category: "intensity-modifiers" },
  { word: "acutely", definition: "In a very intense way; to a sharp or severe degree.", exampleSentence: "The shortage is most acutely felt in rural and under-resourced communities.", translationHint: null, category: "intensity-modifiers" },
  { word: "invariably", definition: "In every case; without any exception; always.", exampleSentence: "When quality standards are lowered, overall output invariably suffers.", translationHint: null, category: "intensity-modifiers" },
  { word: "characteristically", definition: "In a way that is typical or distinctive of a person or thing.", exampleSentence: "He responded to the criticism in his characteristically measured and calm tone.", translationHint: null, category: "intensity-modifiers" },
  { word: "distinctly", definition: "So clearly that there can be no doubt; unmistakably.", exampleSentence: "There is a distinctly different tone in his later published works.", translationHint: null, category: "intensity-modifiers" },
  { word: "manifestly", definition: "In a way that is clear and obvious to anyone; openly.", exampleSentence: "The ruling was manifestly unfair to those most affected by the policy.", translationHint: null, category: "intensity-modifiers" },

  // ── PHRASAL VERBS (20) ──────────────────────────────────────────────────
  { word: "bring up", definition: "To introduce a topic in conversation; to raise an issue.", exampleSentence: "She decided to bring up the budget discrepancy at the next board meeting.", translationHint: null, category: "phrasal-verbs" },
  { word: "look into", definition: "To investigate or research something thoroughly.", exampleSentence: "The committee will look into the allegations before making any statement.", translationHint: null, category: "phrasal-verbs" },
  { word: "carry out", definition: "To execute a task or plan; to put something into practice.", exampleSentence: "The engineers carried out a series of rigorous stress tests on the prototype.", translationHint: null, category: "phrasal-verbs" },
  { word: "point out", definition: "To draw attention to something; to indicate clearly.", exampleSentence: "She was quick to point out the logical flaws in the proposed argument.", translationHint: null, category: "phrasal-verbs" },
  { word: "build on", definition: "To use something as a foundation for further development.", exampleSentence: "This research builds on earlier foundational work by Smith and colleagues.", translationHint: null, category: "phrasal-verbs" },
  { word: "break down", definition: "To analyze something into its component parts; also: to stop functioning.", exampleSentence: "Let us break down the overall argument into its three core components.", translationHint: null, category: "phrasal-verbs" },
  { word: "back up", definition: "To support or reinforce a claim with evidence.", exampleSentence: "The statistical data backs up the initial hypothesis convincingly.", translationHint: null, category: "phrasal-verbs" },
  { word: "follow up", definition: "To pursue a matter further; to check on the progress of something.", exampleSentence: "We need to follow up on the leads identified during last week's investigation.", translationHint: null, category: "phrasal-verbs" },
  { word: "stand out", definition: "To be noticeably better or more distinctive than others.", exampleSentence: "One argument in the debate stood out as particularly compelling and original.", translationHint: null, category: "phrasal-verbs" },
  { word: "put forward", definition: "To propose or suggest something for consideration or debate.", exampleSentence: "Several alternative strategies were put forward during the planning session.", translationHint: null, category: "phrasal-verbs" },
  { word: "draw on", definition: "To make use of a source of knowledge or experience.", exampleSentence: "The author draws on decades of fieldwork to support her central argument.", translationHint: null, category: "phrasal-verbs" },
  { word: "set out", definition: "To begin a task with a clear intention; or to explain something systematically.", exampleSentence: "The report sets out the key recommendations for institutional reform.", translationHint: null, category: "phrasal-verbs" },
  { word: "account for", definition: "To explain something; also: to constitute a particular proportion of a total.", exampleSentence: "How do you account for the significant discrepancy in the figures?", translationHint: null, category: "phrasal-verbs" },
  { word: "rule out", definition: "To eliminate something as a possibility.", exampleSentence: "At this stage, we cannot rule out the possibility of a technical malfunction.", translationHint: null, category: "phrasal-verbs" },
  { word: "give rise to", definition: "To cause something to happen or come into being.", exampleSentence: "The new policy gave rise to widespread debate among economists and policymakers.", translationHint: null, category: "phrasal-verbs" },
  { word: "fall back on", definition: "To rely on something as a last resort when other options have failed.", exampleSentence: "When the original plan collapsed, the team had no strategy to fall back on.", translationHint: null, category: "phrasal-verbs" },
  { word: "weigh up", definition: "To carefully consider the advantages and disadvantages before deciding.", exampleSentence: "We need to weigh up the pros and cons carefully before committing to either path.", translationHint: null, category: "phrasal-verbs" },
  { word: "narrow down", definition: "To reduce a large set of options to a smaller, more manageable one.", exampleSentence: "The investigation helped narrow down the list of possible causes significantly.", translationHint: null, category: "phrasal-verbs" },
  { word: "make up", definition: "To constitute or form; also: to compensate for or to invent.", exampleSentence: "Small businesses make up over 90% of the country's registered enterprises.", translationHint: null, category: "phrasal-verbs" },
  { word: "turn out", definition: "To result or prove to be; to come to light eventually.", exampleSentence: "The investment turned out to be far more profitable than initially projected.", translationHint: null, category: "phrasal-verbs" },

  // ── GENERAL VOCABULARY (20) ─────────────────────────────────────────────
  { word: "fundamental", definition: "Forming a necessary base or core; of central importance.", exampleSentence: "Access to clean water is fundamental to any meaningful public health strategy.", translationHint: null, category: "general" },
  { word: "compelling", definition: "Powerfully evoking interest, attention, or admiration; convincing.", exampleSentence: "She made a compelling case for restructuring the organization's governance model.", translationHint: null, category: "general" },
  { word: "concise", definition: "Giving a lot of information clearly and briefly; free from unnecessary words.", exampleSentence: "A concise executive summary helps stakeholders grasp the key points immediately.", translationHint: null, category: "general" },
  { word: "nuanced", definition: "Characterized by subtle and often complex distinctions; not black and white.", exampleSentence: "A nuanced understanding of local culture is essential for effective diplomacy.", translationHint: null, category: "general" },
  { word: "coherent", definition: "Logical and consistent; forming a unified whole that is easy to follow.", exampleSentence: "The paper presents a coherent argument supported by solid empirical evidence.", translationHint: null, category: "general" },
  { word: "ambiguous", definition: "Open to more than one interpretation; not having a single clear meaning.", exampleSentence: "The wording of the contract clause was deliberately ambiguous, leading to litigation.", translationHint: null, category: "general" },
  { word: "pragmatic", definition: "Dealing with things sensibly and practically rather than ideologically.", exampleSentence: "A pragmatic approach to reform avoids getting bogged down in ideological purity.", translationHint: null, category: "general" },
  { word: "inevitable", definition: "Certain to happen; too powerful or certain to be avoided.", exampleSentence: "Given the current trends, a major industry restructuring appears inevitable.", translationHint: null, category: "general" },
  { word: "intricate", definition: "Very complicated or detailed; having many interrelated parts.", exampleSentence: "The intricate web of regulations makes full compliance extremely challenging.", translationHint: null, category: "general" },
  { word: "comprehensive", definition: "Complete; including all or nearly all elements or aspects of something.", exampleSentence: "A comprehensive literature review is essential before designing a new study.", translationHint: null, category: "general" },
  { word: "preliminary", definition: "Preceding or done in preparation for the main action or event.", exampleSentence: "The preliminary findings suggest a significant correlation that warrants further study.", translationHint: null, category: "general" },
  { word: "subsequent", definition: "Coming after something in time; following.", exampleSentence: "The initial discovery and all subsequent research confirmed the underlying trend.", translationHint: null, category: "general" },
  { word: "arbitrary", definition: "Based on random choice or personal whim rather than reason or system.", exampleSentence: "The arbitrary enforcement of rules ultimately undermines their legitimacy.", translationHint: null, category: "general" },
  { word: "pervasive", definition: "Present or spreading throughout a whole area or group; widespread.", exampleSentence: "There is a pervasive sense of uncertainty in the current political climate.", translationHint: null, category: "general" },
  { word: "ostensibly", definition: "As it seems on the surface; supposedly but not necessarily actually.", exampleSentence: "The new regulation was ostensibly about safety, but critics saw a commercial agenda.", translationHint: null, category: "general" },
  { word: "reciprocal", definition: "Given, felt, or done in return; mutual; shared between two parties.", exampleSentence: "The two nations signed a reciprocal trade agreement eliminating most tariffs.", translationHint: null, category: "general" },
  { word: "analogous", definition: "Comparable in certain respects; similar or parallel in some way.", exampleSentence: "The current situation is analogous to the fiscal crisis experienced in the 1970s.", translationHint: null, category: "general" },
  { word: "explicit", definition: "Clearly stated; leaving nothing implied; detailed and unambiguous.", exampleSentence: "The agreement includes explicit financial penalties for any late delivery.", translationHint: null, category: "general" },
  { word: "implicit", definition: "Suggested but not directly expressed; implied rather than stated.", exampleSentence: "There was an implicit understanding that overtime hours would not be compensated.", translationHint: null, category: "general" },
  { word: "profound", definition: "Very great in depth, intensity, or scope; having deep intellectual insight.", exampleSentence: "The landmark report had a profound impact on all subsequent policy decisions.", translationHint: null, category: "general" },
];

function formatClozeSentence(sentence: string, targetChunk: string): string {
  if (sentence.includes(`{{${targetChunk}}}`)) return sentence;
  const regex = new RegExp(`\\b(${targetChunk})\\b`, "i");
  if (regex.test(sentence)) {
    return sentence.replace(regex, "{{$1}}");
  }
  return sentence;
}

export const INITIAL_VOCABULARY: SeedCard[] = RAW_VOCABULARY.map((item) => ({
  sentence: formatClozeSentence(item.exampleSentence, item.word),
  targetChunk: item.word,
  meaning: item.definition,
  hint: item.translationHint,
  sourceContext: "Initial Core Lexicon",
  deckId: item.category,
  state: 0,
  due: new Date().toISOString(),
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  learningSteps: 0,
  lastReview: null,
  isActive: true,
}));
