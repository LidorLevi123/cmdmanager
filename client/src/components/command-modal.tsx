import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          id="quick-command-dialog"
        >
          <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
            {initialCommand ? "Edit Quick Command" : "Add Quick Command"}
          </Dialog.Title>
          <Dialog.Description 
            id="quick-command-dialog-description"
            className="sr-only"
          >
            {initialCommand ? "Edit an existing quick command's label and command" : "Create a new quick command with a label and command"}
          </Dialog.Description>
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
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!label.trim() || !command.trim()}>
              Save
            </Button>
          </div>
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 