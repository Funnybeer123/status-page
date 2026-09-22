import { isLiving } from "@/lib/privacy";

export type InterviewCandidate = {
  id: string;
  name: string;
  born?: string | null;
  reason: string;
};

export function compileInterviewList(
  people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null }[],
  answeredPersonIds: string[],
) {
  const answered = new Set(answeredPersonIds);
  return people
    .filter((person) => isLiving(person))
    .map((person) => ({
      id: person.id,
      name: person.displayName,
      born: person.birthDate ? String(person.birthDate).slice(0, 10) : null,
      reason: answered.has(person.id) ? "Already answered an interview" : "No interview answers yet",
    }))
    .filter((person) => person.reason === "No interview answers yet")
    .sort((a, b) => String(a.born || "9999").localeCompare(String(b.born || "9999")));
}
