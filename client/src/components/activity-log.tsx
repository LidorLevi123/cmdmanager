import { History, Download, Trash2, Send, Plug, Unplug, Server, Eye, X, Loader2, RotateCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActivityLog } from "@/hooks/use-activity-log";
import { ActivityLogEntry } from "@shared/schema";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const getActivityIcon = (type: ActivityLogEntry['type']) => {
  switch (type) {
    case 'command_dispatched':
      return <Send className="w-4 h-4" />;
    case 'client_connected':
      return <Plug className="w-4 h-4" />;
    case 'client_disconnected':
      return <Unplug className="w-4 h-4" />;
    case 'server_started':
      return <Server className="w-4 h-4" />;
    default:
      return <History className="w-4 h-4" />;
  }
};

const getActivityColor = (type: ActivityLogEntry['type']) => {
  switch (type) {
    case 'command_dispatched':
      return 'bg-blue-50 border-blue-100 text-blue-600';
    case 'client_connected':
      return 'bg-green-50 border-green-100 text-green-600';
    case 'client_disconnected':
      return 'bg-red-50 border-red-100 text-red-600';
    case 'server_started':
      return 'bg-gray-50 border-gray-200 text-gray-600';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-600';
  }
};

function ActivityLog() {
  const { data: activityLog = [], refetch } = useActivityLog();
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commandMutation = useMutation({
    mutationFn: async (data: { classId: string; clientId?: string; cmd: string }) => {
      const response = await apiRequest("POST", "/api/command", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Command Resent",
        description: `Sent to ${data.clientsNotified} clients successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Command Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResend = (entry: ActivityLogEntry) => {
    if (!entry.metadata?.command || !entry.metadata?.classId) return;
    
    commandMutation.mutate({
      classId: entry.metadata.classId,
      clientId: entry.metadata.clientId,
      cmd: entry.metadata.command,
    });
  };

  const clearLog = async () => {
    try {
      await fetch('/api/activity-log', { method: 'DELETE' });
      refetch();
    } catch (error) {
      console.error('Failed to clear log:', error);
    }
  };

  const exportLog = () => {
    const logData = JSON.stringify(activityLog, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <History className="text-yellow-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
              <p className="text-sm text-gray-500">Recent commands and connections</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLog}
              className="text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportLog}
              className="text-gray-400 hover:text-gray-600"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activityLog.length > 0 ? (
            activityLog.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border group ${getActivityColor(entry.type)}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(entry.type).replace('border-', 'bg-').replace('-50', '-100')}`}>
                  {getActivityIcon(entry.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                  {entry.metadata && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {entry.type === 'command_dispatched' && entry.metadata.clientsNotified && (
                          <p>Delivered to {entry.metadata.clientCount} clients: {entry.metadata.clientsNotified.join(', ')}</p>
                        )}
                        {entry.type === 'client_connected' && entry.metadata.ip && (
                          <p>IP: {entry.metadata.ip} • Socket established</p>
                        )}
                        {entry.type === 'client_disconnected' && (
                          <p>Connection closed • Removed from waiting list</p>
                        )}
                        {entry.type === 'server_started' && entry.metadata.endpoints && (
                          <p>Endpoints: {entry.metadata.endpoints.join(', ')}</p>
                        )}
                      </div>
                      {entry.type === 'command_dispatched' && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => handleResend(entry)}
                            disabled={commandMutation.isPending}
                          >
                            <RotateCw className={`w-4 h-4 mr-1 ${commandMutation.isPending ? 'animate-spin' : ''}`} />
                            Resend
                          </Button>
                          {entry.metadata?.outputs && Object.keys(entry.metadata.outputs).length > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Output
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500"
                              disabled
                            >
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Waiting...
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="text-gray-400 w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
              <p className="text-gray-500">Activity will appear here as commands are sent and clients connect</p>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog.Root open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-auto max-w-[50vw] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Command Output
            </Dialog.Title>
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Command:</p>
                  <pre className="text-sm text-gray-600 bg-white p-2 rounded border">
                    {selectedEntry?.metadata?.command || 'No command available'}
                  </pre>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Outputs:</p>
                  {selectedEntry?.metadata?.outputs ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {Object.entries(selectedEntry.metadata.outputs).map(([hostname, data]: [string, any]) => (
                        <div key={hostname} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{hostname}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(data.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre className={`text-sm whitespace-pre-wrap ${data.isError ? 'text-red-600' : 'text-gray-600'} max-h-[200px] overflow-y-auto`}>
                            {data.output || 'No output'}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-500">Waiting for output from clients...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}

export default ActivityLog;
