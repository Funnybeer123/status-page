export function defaultFamilyRules() {
  return [
    "Viewers do not see a living relative’s birth year or private notes.",
    "Living minors stay off share links and do not appear in photographs for viewers.",
    "Ask only uses letters, stories, and notes the family kept in — not what a relative marked keep-out of Ask.",
    "Owners decide who may join, and a guest-researcher invite can expire.",
  ].join("\n");
}

export function familyRulesHeading(hasCustom: boolean) {
  return hasCustom ? "Family rules" : "Family rules · still the usual ones";
}

export function missingRulesHeading() {
  return "The family has not written its own rules yet";
}

export function rulesDenied() {
  return "Only owners can edit the family rules";
}
