export function isNight(user?: { nightMode?: boolean | null } | null) {
  return Boolean(user?.nightMode);
}

export function nightQuietHeading() {
  return "Night quiet";
}

export function nightSettingsHeading(on: boolean) {
  return on ? "Night mode is on" : "Night mode is off";
}
