import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ConnectedClient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useClients() {
  return useQuery<ConnectedClient[]>({
    queryKey: ["/api/clients"],
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/clients");
      return response.json();
    }
  });
}

export function useChangeClientClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, newClass, currentClass }: { clientId: string; newClass: string; currentClass: string }) => {
      const response = await apiRequest("POST", "/api/command", {
        clientId,
        classId: currentClass,
        cmd: `echo ${newClass} > C:\\cmdmanager\\class.txt`
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }
  });
}

export function useRemoveClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/remove`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }
  });
}
