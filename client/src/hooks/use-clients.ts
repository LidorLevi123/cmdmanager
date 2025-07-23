import { useQuery } from "@tanstack/react-query";
import { ConnectedClient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useClients() {
  return useQuery<ConnectedClient[]>({
    queryKey: ["/api/clients"],
    refetchInterval: 5000, // Refresh every 5 seconds
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/clients");
      return response.json();
    }
  });
}
