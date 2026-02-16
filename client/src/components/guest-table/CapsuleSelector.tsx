import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Guest } from "@shared/schema";
import { compareCapsuleNumbers } from "./useGuestSorting";
import type { AvailableCapsule } from "./types";

interface CapsuleSelectorProps {
  guest: Guest;
  isAuthenticated: boolean;
  availableCapsules: AvailableCapsule[];
  onCapsuleChange: (guest: Guest, newCapsuleNumber: string) => void;
}

export function CapsuleSelector({ guest, isAuthenticated, availableCapsules, onCapsuleChange }: CapsuleSelectorProps) {
  const { toast } = useToast();
  const currentCapsule = guest.capsuleNumber;

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => {
          toast({
            title: "Authentication Required",
            description: "Please login to change capsule assignments",
            variant: "destructive",
          });
          const currentPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
        title="Click to login and change capsule"
      >
        {currentCapsule}
      </button>
    );
  }

  const capsuleOptions = [
    { number: currentCapsule, isCurrent: true },
    ...availableCapsules
      .filter(c => c.number !== currentCapsule && c.toRent)
      .map(c => ({ number: c.number, isCurrent: false }))
  ].sort((a, b) => compareCapsuleNumbers(a.number, b.number));

  return (
    <Select
      value={currentCapsule}
      onValueChange={(newCapsule) => onCapsuleChange(guest, newCapsule)}
    >
      <SelectTrigger className="w-16 h-8 text-xs">
        <SelectValue>{currentCapsule}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {capsuleOptions.map((option) => (
          <SelectItem
            key={option.number}
            value={option.number}
            className={option.isCurrent ? "font-medium bg-blue-50" : ""}
          >
            {option.number}
            {option.isCurrent && " (current)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
