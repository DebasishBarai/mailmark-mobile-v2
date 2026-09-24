/** Quick choices for "Send later", as a mail app offers them. */
export function schedulePresets(now = new Date()): { label: string; at: Date }[] {
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  inOneHour.setSeconds(0, 0);

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(now.getDate() + 1);
  tomorrowMorning.setHours(8, 0, 0, 0);

  const tomorrowAfternoon = new Date(tomorrowMorning);
  tomorrowAfternoon.setHours(13, 0, 0, 0);

  const monday = new Date(now);
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(8, 0, 0, 0);

  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

  return [
    { label: `In 1 hour (${fmt(inOneHour)})`, at: inOneHour },
    { label: `Tomorrow morning (${fmt(tomorrowMorning)})`, at: tomorrowMorning },
    { label: `Tomorrow afternoon (${fmt(tomorrowAfternoon)})`, at: tomorrowAfternoon },
    { label: `Monday morning (${fmt(monday)})`, at: monday },
  ];
}

/** True when `at` is at least `marginMs` from now. */
export function isInFuture(at: Date, marginMs = 0): boolean {
  return at.getTime() > Date.now() + marginMs;
}
