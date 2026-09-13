/** Shared constants/helpers for weekly-schedule rendering (grid + "next class" calculations). */

export const DAY_LABELS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export const PERIOD_LABELS: Record<number, string> = {
  1: "08:00–09:30",
  2: "09:45–11:15",
  3: "11:30–13:00",
  4: "13:30–15:00",
  5: "15:15–16:45",
};

/** Maps JS's Sun-first `Date.getDay()` to this app's Sat-first day index (-1 = Friday, not shown). */
export function getAlexDay(): number {
  const jsDay = new Date().getDay();
  const map: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: -1 };
  return map[jsDay] ?? -1;
}
