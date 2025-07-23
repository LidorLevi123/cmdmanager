import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Terminal, Send, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const ALLOWED_CLASS_IDS = ['58.0.6', '58.1.1', '58.-1.23'];
const QUICK_COMMANDS = [
  { label: 'System Info', command: 'systeminfo' },
  { label: 'IP Config', command: 'ipconfig' },
  { label: 'Restart', command: 'restart' },
  { label: 'Ping Test', command: 'ping google.com' },
];

function CommandForm() {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [commandText, setCommandText] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commandMutation = useMutation({
    mutationFn: async (data: { classId: string; cmd: string }) => {
      const response = await apiRequest('POST', '/api/command', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Command Dispatched",
        description: `Sent to ${data.clientsNotified} clients successfully`,
      });
      setCommandText('');
      setSelectedClassId('');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/activity-log'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
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
      cmd: commandText.trim(),
    });
  };

  const insertQuickCommand = (command: string) => {
    setCommandText(command);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Terminal className="text-primary w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Send Command</h2>
            <p className="text-sm text-gray-500">Dispatch to client fleet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Target Class ID
            </Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
              Command
            </Label>
            <div className="relative">
              <Textarea
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

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500 flex items-center">
              <Info className="w-3 h-3 mr-1" />
              Commands sent via POST /api/command
            </div>
            <Button 
              type="submit" 
              disabled={commandMutation.isPending}
              className="bg-primary hover:bg-blue-600"
            >
              <Send className="w-4 h-4 mr-2" />
              {commandMutation.isPending ? 'Dispatching...' : 'Dispatch'}
            </Button>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Commands</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_COMMANDS.map((item) => (
              <Button
                key={item.command}
                variant="outline"
                size="sm"
                onClick={() => insertQuickCommand(item.command)}
                className="text-xs"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CommandForm;
