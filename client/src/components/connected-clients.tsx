import { Monitor, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/use-clients";

const CLIENT_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-purple-100 text-purple-600',
  'bg-orange-100 text-orange-600',
  'bg-red-100 text-red-600',
  'bg-teal-100 text-teal-600',
];

function ConnectedClients() {
  const { data: clients = [], isLoading, refetch } = useClients();

  const getClientColor = (index: number) => {
    return CLIENT_COLORS[index % CLIENT_COLORS.length];
  };

  return (
    <Card>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Monitor className="text-green-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connected Clients</h2>
              <p className="text-sm text-gray-500">Long-polling connections</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              {clients.length} Online
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {clients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map((client, index) => (
              <div
                key={client.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getClientColor(index)}`}>
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{client.hostname}</h3>
                      <p className="text-sm text-gray-500">Class: {client.classId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">{client.connectionDuration}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Connected:</span>
                    <span>{new Date(client.connectedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IP:</span>
                    <span className="font-mono">{client.ip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="text-gray-400 w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Clients</h3>
            <p className="text-gray-500">Clients will appear here when they connect to the long-polling endpoint</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConnectedClients;
