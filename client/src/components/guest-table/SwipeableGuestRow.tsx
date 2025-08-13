import { useState, useRef, useCallback, useEffect } from "react";
import { UserMinus, ChevronLeft } from "lucide-react";
import type { Guest } from "@shared/schema";

interface SwipeableGuestRowProps {
  guest: Guest;
  onCheckout: (guestId: string) => void;
  onGuestClick: (guest: Guest) => void;
  isCondensedView: boolean;
  children: React.ReactNode;
  isCheckingOut?: boolean;
  isMobile: boolean;
}

export function SwipeableGuestRow({ guest, onCheckout, onGuestClick, isCondensedView, children, isCheckingOut, isMobile }: SwipeableGuestRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const maxSwipeRef = useRef<number>(0);
  const rowRef = useRef<HTMLTableRowElement>(null);
  
  const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger checkout
  const MAX_SWIPE = 120; // Maximum visual swipe distance

  const handleStart = useCallback((clientX: number) => {
    if (isCheckingOut) return;
    startXRef.current = clientX;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    maxSwipeRef.current = 0;
  }, [isCheckingOut]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || isCheckingOut) return;
    
    const diff = startXRef.current - clientX; // Positive when swiping left
    if (diff > 0) { // Only allow left swipe
      const clampedOffset = Math.min(diff, MAX_SWIPE);
      setSwipeOffset(clampedOffset);
      maxSwipeRef.current = Math.max(maxSwipeRef.current, clampedOffset);
    }
  }, [isDragging, isCheckingOut]);

  const handleEnd = useCallback(() => {
    if (!isDragging || isCheckingOut) return;
    
    const swipeTime = Date.now() - startTimeRef.current;
    const shouldCheckout = maxSwipeRef.current >= SWIPE_THRESHOLD || 
                          (maxSwipeRef.current >= 50 && swipeTime < 300); // Quick swipe threshold
    
    setIsDragging(false);
    
    if (shouldCheckout) {
      // Keep the swipe visual during checkout
      setSwipeOffset(MAX_SWIPE);
      onCheckout(guest.id);
    } else {
      // Animate back to original position
      setSwipeOffset(0);
    }
  }, [isDragging, isCheckingOut, guest.id, onCheckout]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Reset swipe state when checkout completes
  useEffect(() => {
    if (!isCheckingOut && swipeOffset > 0) {
      const timer = setTimeout(() => setSwipeOffset(0), 100);
      return () => clearTimeout(timer);
    }
  }, [isCheckingOut, swipeOffset]);

  const swipeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);
  const backgroundColor = swipeProgress > 0 
    ? `rgba(239, 68, 68, ${0.1 + swipeProgress * 0.2})` // Red background with increasing opacity
    : 'transparent';

  return (
    <tr
      ref={rowRef}
      className={`hover:bg-gray-50 transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isCheckingOut ? 'opacity-75' : ''} relative`}
      style={{
        transform: `translateX(-${swipeOffset}px)`,
        backgroundColor,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out, background-color 0.2s ease-out',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {/* Checkout action revealed during swipe */}
      {swipeOffset > 10 && (
        <td 
          className="absolute right-0 top-0 h-full flex items-center justify-center px-4 pointer-events-none"
          style={{ 
            width: `${Math.min(swipeOffset, MAX_SWIPE)}px`,
            backgroundColor: swipeProgress >= 1 ? '#dc2626' : '#ef4444',
            transition: isDragging ? 'none' : 'all 0.3s ease-out',
          }}
        >
          <div className="flex items-center text-white font-medium text-sm">
            {swipeProgress >= 1 ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                {isCheckingOut ? 'Checking out...' : 'Release to checkout'}
              </>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Swipe to checkout
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}