import { Monitor, RefreshCw, Search, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClients, useChangeClientClass } from "@/hooks/use-clients";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ALLOWED_CLASS_IDS } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "hostname", label: "Hostname" },
  { value: "ip", label: "IP Address" },
];

function ConnectedClients() {
  const { data: clients = [], isLoading, refetch } = useClients();
  const changeClass = useChangeClientClass();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [changeClassDialog, setChangeClassDialog] = useState<{
    isOpen: boolean;
    clientId: string;
    currentClass: string;
  }>({ isOpen: false, clientId: "", currentClass: "" });

  // Get unique class IDs from clients
  const uniqueClassIds = useMemo(() => {
    const classIds = new Set(clients.map(client => client.classId));
    return Array.from(classIds).sort();
  }, [clients]);

  // Get all available classes
  const availableClasses = useMemo(() => Array.from(ALLOWED_CLASS_IDS).sort(), []);

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = [...clients];

    // Apply class filter
    if (selectedClass && selectedClass !== 'all') {
      filtered = filtered.filter(client => client.classId === selectedClass);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.hostname.toLowerCase().includes(query) ||
        client.ip.toLowerCase().includes(query) ||
        client.classId.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime();
        case "oldest":
          return new Date(a.connectedAt).getTime() - new Date(b.connectedAt).getTime();
        case "hostname":
          return a.hostname.localeCompare(b.hostname);
        case "ip":
          return a.ip.localeCompare(b.ip);
        default:
          return 0;
      }
    });

    return filtered;
  }, [clients, selectedClass, searchQuery, sortBy]);

  const handleChangeClass = async (newClass: string) => {
    if (changeClass.isPending) return; // Prevent multiple attempts while loading

    try {
      await changeClass.mutateAsync({
        clientId: changeClassDialog.clientId,
        newClass,
        currentClass: changeClassDialog.currentClass
      });
      toast({
        title: "Success",
        description: "Client class update command sent successfully. The client will reconnect shortly.",
      });
      setChangeClassDialog({ isOpen: false, clientId: "", currentClass: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client class.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-[auto] max-h-[800px] flex flex-col">
      <div className="p-6 border-b border-gray-100 flex-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Monitor className="text-green-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connected Clients</h2>
              <p className="text-sm text-gray-500">
                {filteredAndSortedClients.length} {filteredAndSortedClients.length === 1 ? 'result' : 'results'} found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              {filteredAndSortedClients.length} of {clients.length} Online
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

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search hostname, IP, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={selectedClass}
            onValueChange={setSelectedClass}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {uniqueClassIds.map((classId) => (
                <SelectItem key={classId} value={classId}>
                  {classId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedClass("all");
              setSortBy("newest");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <CardContent className="p-6 overflow-auto flex-1">
        {filteredAndSortedClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedClients.map((client) => (
              <div
                key={client.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 absolute -top-0 -right-0 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setChangeClassDialog({
                          isOpen: true,
                          clientId: client.id,
                          currentClass: client.classId,
                        })
                      }
                      className="cursor-pointer"
                    >
                      Edit Class
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="cursor-not-allowed">
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="text-gray-400 w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Clients</h3>
            <p className="text-gray-500">
              {clients.length > 0 
                ? "No clients match your search criteria"
                : "Clients will appear here when they connect to the long-polling endpoint"}
            </p>
          </div>
        )}
      </CardContent>

      <Dialog
        open={changeClassDialog.isOpen}
        onOpenChange={(isOpen) =>
          !changeClass.isPending && setChangeClassDialog((prev) => ({ ...prev, isOpen }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select
              onValueChange={handleChangeClass}
              defaultValue={changeClassDialog.currentClass}
              disabled={changeClass.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((classId) => (
                  <SelectItem key={classId} value={classId}>
                    {classId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setChangeClassDialog({ isOpen: false, clientId: "", currentClass: "" })
              }
              disabled={changeClass.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ConnectedClients;
