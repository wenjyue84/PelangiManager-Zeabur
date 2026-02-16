import { useState, useMemo } from "react";
import type { SortField, SortOrder, SortConfig, CombinedDataItem } from "./types";

// Helper for natural capsule number sorting: first by prefix (C, J, R), then by number (1, 2, ..., 10, 11)
export const parseCapsuleNumber = (cap: string | null | undefined) => {
  if (!cap) return { prefix: 'ZZZ', num: 999999 };
  const match = cap.match(/^([A-Za-z]+)(\d+)$/);
  if (match) {
    return { prefix: match[1].toUpperCase(), num: parseInt(match[2], 10) };
  }
  return { prefix: cap.toUpperCase(), num: 0 };
};

export const compareCapsuleNumbers = (a: string | null | undefined, b: string | null | undefined): number => {
  const aParsed = parseCapsuleNumber(a);
  const bParsed = parseCapsuleNumber(b);

  if (aParsed.prefix !== bParsed.prefix) {
    return aParsed.prefix.localeCompare(bParsed.prefix);
  }
  return aParsed.num - bParsed.num;
};

export function useGuestSorting(filteredData: CombinedDataItem[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'capsuleNumber',
    order: 'asc'
  });

  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];

    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'name':
          aValue = (a.type === 'guest' ? a.data.name : a.data.name).toLowerCase();
          bValue = (b.type === 'guest' ? b.data.name : b.data.name).toLowerCase();
          break;
        case 'capsuleNumber':
          // Natural sort for capsule numbers using helper function
          const capsuleCompare = compareCapsuleNumbers(a.data.capsuleNumber, b.data.capsuleNumber);
          return sortConfig.order === 'asc' ? capsuleCompare : -capsuleCompare;
        case 'checkinTime':
          aValue = a.type === 'guest' ? new Date(a.data.checkinTime).getTime() : new Date((a.data as any).createdAt).getTime();
          bValue = b.type === 'guest' ? new Date(b.data.checkinTime).getTime() : new Date((b.data as any).createdAt).getTime();
          break;
        case 'expectedCheckoutDate':
          aValue = a.type === 'guest'
            ? (a.data.expectedCheckoutDate ? new Date(a.data.expectedCheckoutDate).getTime() : 0)
            : new Date((a.data as any).expiresAt).getTime();
          bValue = b.type === 'guest'
            ? (b.data.expectedCheckoutDate ? new Date(b.data.expectedCheckoutDate).getTime() : 0)
            : new Date((b.data as any).expiresAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  return { sortConfig, sortedData, handleSort };
}
