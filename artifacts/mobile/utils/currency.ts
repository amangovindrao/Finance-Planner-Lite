export function fmt(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

export function fmtFull(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export function fmtHidden(): string {
  return "₹****";
}
