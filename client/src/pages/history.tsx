import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { Guest, PaginatedResponse, Capsule } from "@shared/schema";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";

function formatDuration(checkinTime: string, checkoutTime: string): string {
  const checkin = new Date(checkinTime);
  const checkout = new Date(checkoutTime);
  const diff = checkout.getTime() - checkin.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

function getInitials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export default function History() {
  const labels = useAccommodationLabels();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [exactDate, setExactDate] = useState<string>("");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  
  const { data: guestHistoryResponse, isLoading } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/history"],
  });
  
  const guestHistory = guestHistoryResponse?.data || [];

  // Cleaning history
  const { data: cleanedCapsules = [], isLoading: cleaningLoading } = useQuery<Capsule[]>({
    queryKey: ["/api/capsules/cleaning-status/cleaned"],
  });

  const recheckinMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const res = await apiRequest("POST", "/api/guests/recheckin", { id: guestId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({ title: "Updated", description: "Guest moved back to checked-in." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to re-check in guest", variant: "destructive" });
    }
  });

  const filteredHistory = guestHistory.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (dateFilter === "all") return matchesSearch;
    
    const checkinDate = new Date(guest.checkinTime);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (dateFilter) {
      case "today":
        return matchesSearch && checkinDate >= todayStart;
      case "week":
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        return matchesSearch && checkinDate >= weekStart;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return matchesSearch && checkinDate >= monthStart;
      case "exact":
        if (!exactDate) return matchesSearch;
        {
          const d = new Date(exactDate);
          const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
          return matchesSearch && checkinDate >= start && checkinDate <= end;
        }
      case "range":
        if (!rangeStart && !rangeEnd) return matchesSearch;
        {
          const start = rangeStart ? new Date(new Date(rangeStart).setHours(0,0,0,0)) : new Date(0);
          const end = rangeEnd ? new Date(new Date(rangeEnd).setHours(23,59,59,999)) : new Date(8640000000000000);
          return matchesSearch && checkinDate >= start && checkinDate <= end;
        }
      default:
        return matchesSearch;
    }
  });

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-hostel-text">Guest History</CardTitle>
            <p className="text-sm text-gray-600">Complete record of all guest check-ins and check-outs</p>
          </div>
          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="exact">Exact Date…</SelectItem>
                <SelectItem value="range">Date Range…</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === "exact" && (
              <input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="border rounded px-2 py-2 text-sm"
              />
            )}
            {dateFilter === "range" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="border rounded px-2 py-2 text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="border rounded px-2 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No guest history found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.singular}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-medium text-sm">{getInitials(record.name)}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-hostel-text">{record.name}</div>
                            <div className="text-xs text-gray-500">ID: #{record.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-blue-600 text-white">
                          {record.capsuleNumber}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.checkinTime).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.checkoutTime ? new Date(record.checkoutTime).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true 
                        }) : 'Not checked out'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-hostel-text font-medium">
                        {record.checkoutTime ? formatDuration(record.checkinTime.toString(), record.checkoutTime.toString()) : 'Ongoing'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkoutTime ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">
                              Completed
                            </Badge>
                            <button
                              onClick={() => recheckinMutation.mutate(record.id)}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Undo (Re-check in)
                            </button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Ongoing
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">1-{filteredHistory.length}</span> of <span className="font-medium">{guestHistory.length}</span> records
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Cleaning History */}
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-hostel-text">Cleaning History</CardTitle>
            <p className="text-sm text-gray-600">Recently cleaned {labels.lowerPlural} with timestamps</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {cleaningLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : cleanedCapsules.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No cleaning records</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capsule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaned At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaned By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cleanedCapsules
                  .filter((c) => !!c.lastCleanedAt)
                  .sort((a, b) => new Date(b.lastCleanedAt || 0).getTime() - new Date(a.lastCleanedAt || 0).getTime())
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3"><Badge className="bg-green-600 text-white">{c.number}</Badge></td>
                      <td className="px-6 py-3 capitalize text-sm text-gray-700">{c.section}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {c.lastCleanedAt ? new Date(c.lastCleanedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">{c.lastCleanedBy || '—'}</td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="bg-green-100 text-green-800">Clean</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
