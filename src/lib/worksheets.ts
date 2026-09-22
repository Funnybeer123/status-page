export type WorksheetKind = "census" | "birth" | "death";

export type WorksheetDraft = {
  kind: WorksheetKind;
  personId: string;
  claim: string;
  pageNote: string;
  happenedOn?: string;
  place?: string;
  title: string;
};

export function compileWorksheet(input: {
  kind: WorksheetKind;
  personName: string;
  year?: string;
  place?: string;
  detail?: string;
  personId: string;
}): WorksheetDraft {
  const year = input.year?.trim();
  const place = input.place?.trim();
  const detail = input.detail?.trim();
  if (input.kind === "census") {
    return {
      kind: "census",
      personId: input.personId,
      title: `${year || "Census"} household`,
      claim: `${input.personName} was counted${year ? ` in ${year}` : ""}${place ? ` at ${place}` : ""}.`,
      pageNote: [year ? `${year} census` : "Census", place, detail].filter(Boolean).join(", "),
      happenedOn: year ? `${year}-04-01` : undefined,
      place,
    };
  }
  if (input.kind === "birth") {
    return {
      kind: "birth",
      personId: input.personId,
      title: `Birth of ${input.personName}`,
      claim: `${input.personName} was born${year ? ` in ${year}` : ""}${place ? ` at ${place}` : ""}.`,
      pageNote: [year ? `Birth ${year}` : "Birth record", place, detail].filter(Boolean).join(", "),
      happenedOn: year && year.length === 10 ? year : year ? `${year}-01-01` : undefined,
      place,
    };
  }
  return {
    kind: "death",
    personId: input.personId,
    title: `Death of ${input.personName}`,
    claim: `${input.personName} died${year ? ` in ${year}` : ""}${place ? ` at ${place}` : ""}.`,
    pageNote: [year ? `Death ${year}` : "Death record", place, detail].filter(Boolean).join(", "),
    happenedOn: year && year.length === 10 ? year : year ? `${year}-01-01` : undefined,
    place,
  };
}
