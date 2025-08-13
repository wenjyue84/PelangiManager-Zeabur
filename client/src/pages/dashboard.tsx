import { lazy, Suspense } from "react";
import { usePerformance } from "@/hooks/use-performance";

// Lazy load heavy components
const SortableGuestTable = lazy(() => import("@/components/sortable-guest-table"));
const DailyNotifications = lazy(() => import("@/components/daily-notifications"));
const AdminNotifications = lazy(() => import("@/components/admin-notifications"));
const OccupancyCalendar = lazy(() => import("@/components/occupancy-calendar"));

// Loading skeleton for components
const ComponentLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
);

export default function Dashboard() {
  // Monitor dashboard performance
  const performanceMetrics = usePerformance("Dashboard");

  return (
    <div className="space-y-6">
      <Suspense fallback={<ComponentLoader />}>
        <SortableGuestTable />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ComponentLoader />}>
          <DailyNotifications />
        </Suspense>
        <Suspense fallback={<ComponentLoader />}>
          <AdminNotifications />
        </Suspense>
      </div>
      <Suspense fallback={<ComponentLoader />}>
        <OccupancyCalendar />
      </Suspense>
    </div>
  );
}