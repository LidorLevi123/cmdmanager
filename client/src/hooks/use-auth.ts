import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import type { AuthResponse, LoginCredentials } from "@shared/schema";

export function useAuth() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Skip auth check if we're on the login page
  const { data: auth, isLoading } = useQuery<AuthResponse>({
    queryKey: ["auth"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    // Disable this query on the login page
    enabled: location !== "/login"
  });

  const login = useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // Store user info in sessionStorage
        sessionStorage.setItem("user", JSON.stringify(data.user));
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.user.fullName}`,
        });
        // Invalidate auth query to refetch user data
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        setLocation("/");
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
      return response.json();
    },
    onSuccess: () => {
      // Clear session storage
      sessionStorage.removeItem("user");
      // Clear auth query data
      queryClient.setQueryData(["auth"], null);
      // Show success message
      toast({
        title: "Logged out successfully",
      });
      // Redirect to login
      setLocation("/login");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  return {
    user: auth?.user,
    isAuthenticated: auth?.success ?? false,
    isLoading: location === "/login" ? false : isLoading,
    login,
    logout,
  };
} 