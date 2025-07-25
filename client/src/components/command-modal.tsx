import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { QuickCommand } from "@/hooks/use-quick-commands";

interface CommandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (command: Omit<QuickCommand, 'id'>) => void;
  initialCommand?: QuickCommand;
}

export function CommandModal({ open, onOpenChange, onSave, initialCommand }: CommandModalProps) {
  const [label, setLabel] = useState("");
  const [command, setCommand] = useState("");

  useEffect(() => {
    if (initialCommand) {
      setLabel(initialCommand.label);
      setCommand(initialCommand.command);
    } else {
      setLabel("");
      setCommand("");
    }
  }, [initialCommand, open]);

  const handleSave = () => {
    if (!label.trim() || !command.trim()) return;
    onSave({ label: label.trim(), command: command.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialCommand ? "Edit Quick Command" : "Add Quick Command"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter a descriptive label..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="command">Command</Label>
            <Textarea
              id="command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter the command..."
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!label.trim() || !command.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 