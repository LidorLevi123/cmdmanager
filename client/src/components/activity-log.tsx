import { History, Download, Trash2, Send, Plug, Unplug, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActivityLog } from "@/hooks/use-activity-log";
import { ActivityLogEntry } from "@shared/schema";

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
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(entry.type)}`}
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
                    <div className="text-xs text-gray-500 mt-1">
                      {entry.type === 'command_dispatched' && entry.metadata.clientsNotified && (
                        <p>Delivered to {entry.metadata.clientCount} clients: {entry.metadata.clientsNotified.join(', ')}</p>
                      )}
                      {entry.type === 'client_connected' && entry.metadata.ip && (
                        <p>IP: {entry.metadata.ip} • Long-polling established</p>
                      )}
                      {entry.type === 'client_disconnected' && (
                        <p>Connection closed • Removed from waiting list</p>
                      )}
                      {entry.type === 'server_started' && entry.metadata.endpoints && (
                        <p>Endpoints: {entry.metadata.endpoints.join(', ')}</p>
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
    </Card>
  );
}

export default ActivityLog;
