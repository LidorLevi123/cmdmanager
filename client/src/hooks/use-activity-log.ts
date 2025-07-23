import { useQuery } from "@tanstack/react-query";
import { ActivityLogEntry } from "@shared/schema";

export function useActivityLog() {
  return useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/activity-log"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
