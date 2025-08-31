import type { Guest } from "@shared/schema";

export function getGuestBalance(guest: Guest): number {
  // First check if there's a specific balance pattern in notes (new format)
  const balanceMatch = guest.notes?.match(/Balance:\s*RM(\d+\.?\d*)/);
  if (balanceMatch) {
    return Number(balanceMatch[1]);
  }
  
  // Fallback to old format for existing guests
  const oldMatch = guest.notes?.match(/RM(\d+\.?\d*)/);
  if (oldMatch) {
    return Number(oldMatch[1]);
  }
  
  // If no balance found in notes and guest is not paid, return 0
  // Don't assume any outstanding balance unless explicitly specified in notes
  return 0;
}

export function isGuestPaid(guest: Guest): boolean {
  return guest.isPaid || getGuestBalance(guest) <= 0;
}
