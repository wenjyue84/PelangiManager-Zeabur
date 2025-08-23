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

// Gender-based capsule assignment logic - SIMPLIFIED!
export function getRecommendedCapsule(gender: string, availableCapsules: any[]): string {
  if (!availableCapsules || availableCapsules.length === 0) {
    return "";
  }
  
  // SIMPLE: Just filter for available capsules (ignore cleaning/maintenance)
  const assignableCapsules = availableCapsules.filter(capsule => 
    capsule.isAvailable && capsule.toRent !== false
  );
  
  if (assignableCapsules.length === 0) {
    return "";
  }
  
  // SIMPLE: Just assign based on gender and section
  if (gender === "female") {
    // For females: find first available back capsule
    const backCapsule = assignableCapsules.find(c => c.section === "back");
    if (backCapsule) return backCapsule.number;
  } else {
    // For males: find first available front capsule
    const frontCapsule = assignableCapsules.find(c => c.section === "front");
    if (frontCapsule) return frontCapsule.number;
  }
  
  // SIMPLE: Fallback to any available capsule
  return assignableCapsules[0]?.number || "";
}