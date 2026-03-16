import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  winDigit: number;
  loseDigit: number;
  currentOwner: string | null;
  onSave: (name: string) => void;
}

export function AdminModal({ open, onClose, winDigit, loseDigit, currentOwner, onSave }: AdminModalProps) {
  const [name, setName] = useState(currentOwner ?? "");

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-foreground/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display text-foreground">
            Assign Square [{winDigit}, {loseDigit}]
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter player name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="bg-background border-foreground/10 text-foreground"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
