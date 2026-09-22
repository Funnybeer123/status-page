export function quietHomeHeading() {
  return "The tree and Ask";
}

export function quietSettingsHeading(on: boolean) {
  return on ? "Quiet mode is on" : "Quiet mode is off";
}

export function isQuiet(user?: { quietMode?: boolean | null } | null) {
  return Boolean(user?.quietMode);
}

export function quietNavLinks() {
  return [
    { href: "/", label: "Home" },
    { href: "/tree", label: "Tree" },
    { href: "/ask", label: "Ask" },
    { href: "/quiet", label: "Quiet mode" },
  ];
}
