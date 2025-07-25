import { useQuery } from "@tanstack/react-query";
import { ActivityLogEntry } from "@shared/schema";

export function useActivityLog() {
  return useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/activity-log"],
    refetchInterval: 1000, // Refresh every second to catch output updates
    refetchOnWindowFocus: true,
  });
}
