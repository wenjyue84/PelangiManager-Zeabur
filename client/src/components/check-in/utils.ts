import type { Guest, Capsule } from "@shared/schema";

// Date and time utilities
export function getCurrentDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const dateString = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  return { timeString, dateString };
}

export function getNextDayDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Guest name utilities
export function getNextGuestNumber(existingGuests: Guest[]): string {
  const guestNumbers = existingGuests
    .map(guest => {
      const match = guest.name.match(/^Guest(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  const maxNumber = guestNumbers.length > 0 ? Math.max(...guestNumbers) : 0;
  return `Guest${maxNumber + 1}`;
}

// User utilities
export function getDefaultCollector(user: any): string {
  if (!user) return "";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.email === "admin@pelangi.com") {
    return "Admin";
  }
  return user.email || "";
}

// Gender-based capsule assignment logic
export function getRecommendedCapsule(gender: string, availableCapsules: Capsule[]): string {
  if (!availableCapsules || availableCapsules.length === 0) return "";
  
  // Filter out uncleaned capsules (should already be filtered by the API, but double-check)
  const cleanedCapsules = availableCapsules.filter(capsule => 
    capsule.cleaningStatus === "cleaned"
  );
  
  if (cleanedCapsules.length === 0) return "";
  
  // Parse capsule numbers for sorting
  const capsulesWithNumbers = cleanedCapsules.map(capsule => {
    const match = capsule.number.match(/C(\d+)/);
    const numericValue = match ? parseInt(match[1]) : 0;
    return { ...capsule, numericValue, originalNumber: capsule.number };
  });

  if (gender === "female") {
    // For females: back capsules with lowest number first, prefer bottom (even numbers)
    const backCapsules = capsulesWithNumbers
      .filter(c => c.section === "back") // Back section
      .sort((a, b) => {
        const aIsBottom = a.numericValue % 2 === 0;
        const bIsBottom = b.numericValue % 2 === 0;
        if (aIsBottom && !bIsBottom) return -1;
        if (!aIsBottom && bIsBottom) return 1;
        return a.numericValue - b.numericValue;
      });
    
    if (backCapsules.length > 0) {
      return backCapsules[0].originalNumber;
    }
  } else {
    // For non-females: front bottom capsules with lowest number first
    const frontBottomCapsules = capsulesWithNumbers
      .filter(c => c.section === "front" && c.numericValue % 2 === 0) // Front section, bottom (even numbers)
      .sort((a, b) => a.numericValue - b.numericValue);
    
    if (frontBottomCapsules.length > 0) {
      return frontBottomCapsules[0].originalNumber;
    }
  }

  // Fallback: any available capsule, prefer bottom (even numbers)
  const sortedCapsules = capsulesWithNumbers.sort((a, b) => {
    const aIsBottom = a.numericValue % 2 === 0;
    const bIsBottom = b.numericValue % 2 === 0;
    if (aIsBottom && !bIsBottom) return -1;
    if (!aIsBottom && bIsBottom) return 1;
    return a.numericValue - b.numericValue;
  });

  return sortedCapsules[0]?.originalNumber || "";
}