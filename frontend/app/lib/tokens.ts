export type TrackedToken = {
  address: string;
  name: string;
  symbol: string;
  curve: string;
};

const KEY = "reflow.tokens.v1";

export function loadTrackedTokens(): TrackedToken[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrackedToken[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrackedToken(token: TrackedToken) {
  const next = [
    token,
    ...loadTrackedTokens().filter((t) => t.address.toLowerCase() !== token.address.toLowerCase()),
  ];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
