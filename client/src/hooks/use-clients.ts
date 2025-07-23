import { useQuery } from "@tanstack/react-query";
import { ConnectedClient } from "@shared/schema";

export function useClients() {
  return useQuery<ConnectedClient[]>({
    queryKey: ["/api/clients"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
