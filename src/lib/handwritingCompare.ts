export type HandSample = {
  id: string;
  personName: string;
  title: string;
  notes?: string | null;
  href?: string | null;
};

export function compareHeading(left?: string | null, right?: string | null) {
  if (left && right) return `${left} beside ${right}`;
  return "Handwriting comparison";
}

export function pairSamples(samples: HandSample[]) {
  return samples.slice(0, 2);
}

export function compareHref(a?: string | null, b?: string | null) {
  if (a && b) return `/handwriting/compare?a=${a}&b=${b}`;
  return "/handwriting/compare";
}
