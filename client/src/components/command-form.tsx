import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Terminal, Send, Info, Plus, Pencil, MoreVertical, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useClients } from "@/hooks/use-clients";
import { useQuickCommands, type QuickCommand } from "@/hooks/use-quick-commands";
import { CommandModal } from "./command-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ConnectedClient } from "@shared/schema";

const ALLOWED_CLASS_IDS = [
  "58.-1.23",
  "58.-1.25",
  "58.0.6",
  "58.0.8",
  "58.1.1",
  "58.1.3",
];
interface SortableItemProps {
  command: QuickCommand;
  isEditing: boolean;
  onEdit: (command: QuickCommand) => void;
  onRemove: (command: QuickCommand) => void;
  onSelect: (command: string) => void;
}

function SortableItem({ command, isEditing, onEdit, onRemove, onSelect }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: command.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Button
        variant="outline"
        size="sm"
        onClick={() => !isEditing && onSelect(command.command)}
        className={`
          w-full text-xs justify-center relative
          ${isEditing ? 'pr-8 shadow-[0_0_0_1px] shadow-primary/20 hover:shadow-[0_0_0_1px] hover:shadow-primary/30' : ''}
          ${isDragging ? 'shadow-lg' : ''}
        `}
      >
        <span className="truncate text-center">{command.label}</span>
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-gray-500" />
          </div>
        )}
      </Button>
      {isEditing && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(command)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRemove(command)}
                className="text-red-600"
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function CommandForm() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [commandText, setCommandText] = useState("");
  const [initialClientId, setInitialClientId] = useState<string | null>(null);
  const commandInputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClients();
  const {
    commands,
    isEditing,
    addCommand,
    editCommand,
    removeCommand,
    reorderCommands,
    setIsEditing,
  } = useQuickCommands();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<QuickCommand | undefined>();

  // Filter clients based on selected class ID
  const filteredClients = clients.filter(
    (client) => !selectedClassId || client.classId === selectedClassId
  );

  // Read query parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const classId = searchParams.get('classId');
    const clientId = searchParams.get('clientId');

    if (classId && ALLOWED_CLASS_IDS.includes(classId)) {
      setSelectedClassId(classId);
      if (clientId) {
        setInitialClientId(clientId);
      }
      
      // Focus the command input
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
      
      // Clear the URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Set client ID after class ID is set and clients are loaded
  useEffect(() => {
    if (initialClientId && selectedClassId && clients.length > 0) {
      const client = clients.find((c: ConnectedClient) => 
        c.id === initialClientId && c.classId === selectedClassId
      );
      if (client) {
        setSelectedClientId(initialClientId);
      }
      setInitialClientId(null); // Clear the initial client ID
    }
  }, [selectedClassId, clients, initialClientId]);

  const commandMutation = useMutation({
    mutationFn: async (data: { classId: string; clientId?: string; cmd: string }) => {
      const response = await apiRequest("POST", "/api/command", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Command Dispatched",
        description: `Sent to ${data.clientsNotified} clients successfully`,
      });
      setCommandText("");
      setSelectedClassId("");
      setSelectedClientId("");
      // Invalidate relevant queries
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !commandText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a class ID and enter a command",
        variant: "destructive",
      });
      return;
    }

    commandMutation.mutate({
      classId: selectedClassId,
      clientId: selectedClientId || undefined,
      cmd: commandText.trim(),
    });
  };

  const insertQuickCommand = (command: string) => {
    setCommandText(command);
  };

  const handleClassIdChange = (value: string) => {
    setSelectedClassId(value);
    // Only reset client selection if the client doesn't belong to the new class
    if (selectedClientId) {
      const client = clients.find((c: ConnectedClient) => 
        c.id === selectedClientId && c.classId === value
      );
      if (!client) {
        setSelectedClientId("");
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = commands.findIndex((cmd) => cmd.id === active.id);
    const newIndex = commands.findIndex((cmd) => cmd.id === over.id);

    reorderCommands(arrayMove(commands, oldIndex, newIndex));
  };

  const handleCommandAction = (action: 'edit' | 'remove', command: QuickCommand) => {
    if (action === 'edit') {
      setSelectedCommand(command);
      setModalOpen(true);
    } else {
      removeCommand(command.id);
    }
  };

  const handleSaveCommand = (command: Omit<QuickCommand, 'id'>) => {
    if (selectedCommand) {
      editCommand(selectedCommand.id, command);
    } else {
      addCommand(command);
    }
    setSelectedCommand(undefined);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Terminal className="text-primary w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Send Command
            </h2>
            <p className="text-sm text-gray-500">Dispatch to client fleet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Target Class ID
            </Label>
            <Select value={selectedClassId} onValueChange={handleClassIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class ID" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_CLASS_IDS.map((classId) => (
                  <SelectItem key={classId} value={classId}>
                    {classId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Target Client {selectedClassId && "(Optional)"}
            </Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={!selectedClassId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedClassId ? "All Clients" : "Select Class ID first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.hostname} ({client.ip})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Command
            </Label>
            <div className="relative">
              <Textarea
                ref={commandInputRef}
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="Enter command to execute..."
                rows={4}
                className="font-mono text-sm resize-none"
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {commandText.length}/500
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 gap-10">
            <div className="text-xs text-gray-500 flex items-center">
              <Info className="w-3 h-3 mr-1" />
              {selectedClientId 
                ? "Command will be sent to selected client only"
                : "Command will be sent to all clients in class"}
            </div>
            <Button
              type="submit"
              disabled={commandMutation.isPending}
              className="bg-primary hover:bg-blue-600"
            >
              <Send className="w-4 h-4 mr-2" />
              {commandMutation.isPending ? "Dispatching..." : "Dispatch"}
            </Button>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              Quick Commands
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setSelectedCommand(undefined);
                  setModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant={isEditing ? "secondary" : "ghost"}
                size="sm"
                className={`h-8 w-8 p-0 transition-colors ${
                  isEditing ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''
                }`}
                onClick={() => setIsEditing(!isEditing)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={commands}
              strategy={horizontalListSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-2">
                {commands.map((command) => (
                  <SortableItem
                    key={command.id}
                    command={command}
                    isEditing={isEditing}
                    onEdit={(cmd) => {
                      setSelectedCommand(cmd);
                      setModalOpen(true);
                    }}
                    onRemove={(cmd) => removeCommand(cmd.id)}
                    onSelect={insertQuickCommand}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </CardContent>

      <CommandModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSaveCommand}
        initialCommand={selectedCommand}
      />
    </Card>
  );
}

export default CommandForm;
