import { StartStep } from "@/lib/startHere";

export function startRingPercent(steps: Array<{ done: boolean }>) {
  if (!steps.length) return 0;
  const done = steps.filter((step) => step.done).length;
  return Math.round((done / steps.length) * 100);
}

export function startRingHeading(percent: number) {
  return `Start-here progress · ${percent}%`;
}

export function startRingDash(percent: number, radius = 42) {
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return { circumference, filled, remaining: circumference - filled };
}

export function incompleteStartHeading(count: number) {
  if (!count) return "Everyone has finished start-here";
  if (count === 1) return "1 start-here step still open";
  return `${count} start-here steps still open`;
}

export function ringLabel(steps: StartStep[]) {
  const parts = steps.map((step) => (step.done ? step.title : `${step.title} still to do`));
  return parts.join(" · ");
}
