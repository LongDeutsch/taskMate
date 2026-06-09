import type { TimeOffRequest } from "../types";

export function getCreatedDateIso(req: TimeOffRequest): string {
  const d = new Date(req.createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function filterTimeOffByCreatedDate(
  items: TimeOffRequest[],
  from: string,
  to: string
): TimeOffRequest[] {
  if (!from && !to) return items;
  return items.filter((req) => {
    const created = getCreatedDateIso(req);
    if (from && created < from) return false;
    if (to && created > to) return false;
    return true;
  });
}
