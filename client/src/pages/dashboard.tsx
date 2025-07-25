import { useQuery } from "@tanstack/react-query";
import { Satellite, Server, TrendingUp, LogOut } from "lucide-react";
import CommandForm from "@/components/command-form";
import ConnectedClients from "@/components/connected-clients";
import ActivityLog from "@/components/activity-log";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ServerStats } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

function Dashboard() {
  const { user, logout } = useAuth();
  const { data: stats } = useQuery<ServerStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Satellite className="text-white w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Command Dispatcher</h1>
                  <p className="text-sm text-gray-500">Real-time Fleet Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info */}
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Welcome, {user.fullName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Server Online</span>
              </div>
              <div className="text-sm text-gray-500">
                Port: <span className="font-mono">3000</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Command Panel */}
          <div className="lg:col-span-1 lg:sticky lg:top-8 lg:self-start">
            <CommandForm />
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connected Clients */}
            <ConnectedClients />

            {/* Activity Log */}
            <ActivityLog />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-blue-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.commandsDispatched || 0}
                      </p>
                      <p className="text-sm text-gray-500">Commands Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Server className="text-green-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalConnections || 0}
                      </p>
                      <p className="text-sm text-gray-500">Total Connections</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Server className="text-purple-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.uptime || '0h 0m'}
                      </p>
                      <p className="text-sm text-gray-500">Server Uptime</p>
                    </div>
                  </div>
                  {stats?.startTime && (
                    <div className="mt-3 text-xs text-gray-500">
                      Started at {new Date(stats.startTime).toLocaleTimeString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
