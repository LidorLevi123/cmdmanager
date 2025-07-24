import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QuickCommand {
  id: string;
  label: string;
  command: string;
}

interface QuickCommandsStore {
  commands: QuickCommand[];
  isEditing: boolean;
  addCommand: (command: Omit<QuickCommand, 'id'>) => void;
  editCommand: (id: string, command: Omit<QuickCommand, 'id'>) => void;
  removeCommand: (id: string) => void;
  reorderCommands: (commands: QuickCommand[]) => void;
  setIsEditing: (isEditing: boolean) => void;
}

export const useQuickCommands = create<QuickCommandsStore>()(
  persist(
    (set) => ({
      commands: [
        { id: '1', label: 'System Info', command: 'systeminfo' },
        { id: '2', label: 'IP Config', command: 'ipconfig' },
        { id: '3', label: 'Restart', command: 'restart' },
        { id: '4', label: 'Ping Test', command: 'ping google.com' },
      ],
      isEditing: false,
      addCommand: (command) =>
        set((state) => ({
          commands: [...state.commands, { ...command, id: crypto.randomUUID() }],
        })),
      editCommand: (id, command) =>
        set((state) => ({
          commands: state.commands.map((cmd) =>
            cmd.id === id ? { ...command, id } : cmd
          ),
        })),
      removeCommand: (id) =>
        set((state) => ({
          commands: state.commands.filter((cmd) => cmd.id !== id),
        })),
      reorderCommands: (commands) => set({ commands }),
      setIsEditing: (isEditing) => set({ isEditing }),
    }),
    {
      name: 'quick-commands-storage',
    }
  )
); 