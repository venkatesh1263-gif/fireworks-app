export function sanitizeText(s) {
  return String(s || "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}
export function fmtINR(n) {
  const num = Number(n || 0);
  return `INR ${num.toFixed(2)}`;
}
export function uiINR(n) {
  const num = Number(n || 0);
  return `₹${Number.isFinite(num) ? num.toFixed(2).replace(/\.00$/, "") : "0"}`;
}
export function itemLabel(i) {
  const cat = sanitizeText(i.category);
  const item = sanitizeText(i.item);
  const sub  = sanitizeText(i.subItem);
  return sub ? `${cat} – ${item} – ${sub}` : `${cat} – ${item}`;
}
