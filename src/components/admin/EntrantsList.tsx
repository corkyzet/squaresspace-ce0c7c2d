import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface EntrantsListProps {
  seasonId: string;
}

interface Entrant {
  id: string;
  name: string;
  email: string;
  boxes_requested: number;
  created_at: string;
}

export function EntrantsList({ seasonId }: EntrantsListProps) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addBoxes, setAddBoxes] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBoxes, setEditBoxes] = useState("1");

  const { data: entrants = [], isLoading } = useQuery({
    queryKey: ["entrants", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrants")
        .select("*")
        .eq("season_id", seasonId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Entrant[];
    },
  });

  const totalBoxes = entrants.reduce((sum, e) => sum + e.boxes_requested, 0);

  const addEntrant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entrants").insert({
        season_id: seasonId,
        name: addName.trim(),
        email: addEmail.toLowerCase().trim(),
        boxes_requested: parseInt(addBoxes, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrants", seasonId] });
      setAddName("");
      setAddEmail("");
      setAddBoxes("1");
      setShowAdd(false);
      toast.success("Entrant added.");
    },
    onError: (err: any) => {
      if (err?.code === "23505") toast.error("Email already registered for this season.");
      else toast.error("Failed to add: " + err.message);
    },
  });

  const updateEntrant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entrants")
        .update({
          name: editName.trim(),
          email: editEmail.toLowerCase().trim(),
          boxes_requested: parseInt(editBoxes, 10),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrants", seasonId] });
      setEditingId(null);
      toast.success("Entrant updated.");
    },
    onError: (err: any) => toast.error("Failed to update: " + err.message),
  });

  const deleteEntrant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entrants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrants", seasonId] });
      toast.success("Entrant removed.");
    },
    onError: (err: any) => toast.error("Failed to remove: " + err.message),
  });

  function startEdit(e: Entrant) {
    setEditingId(e.id);
    setEditName(e.name);
    setEditEmail(e.email);
    setEditBoxes(String(e.boxes_requested));
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading entrants...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Entrants</h3>
          <span className="text-xs font-medium text-muted-foreground">
            {entrants.length} people &middot; {totalBoxes}/100 boxes
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1 text-xs rounded-lg">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); addEntrant.mutate(); }}
          className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-white/[0.03] border border-[hsl(215_30%_16%)]"
        >
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Name</label>
            <Input value={addName} onChange={(e) => setAddName(e.target.value)} className="h-8 text-xs rounded-lg" required />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="h-8 text-xs rounded-lg" required />
          </div>
          <div className="w-24">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Boxes</label>
            <Select value={addBoxes} onValueChange={setAddBoxes}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={addEntrant.isPending} className="h-8 text-xs">Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="h-8 text-xs">Cancel</Button>
        </form>
      )}

      <div className="border border-[hsl(215_30%_16%)] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-left">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Boxes</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entrants.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No entrants yet.</td></tr>
            )}
            {entrants.map((e) => (
              <tr key={e.id} className="border-t border-[hsl(215_30%_14%)] hover:bg-white/[0.03] transition-colors">
                {editingId === e.id ? (
                  <>
                    <td className="px-2 py-1"><Input value={editName} onChange={(ev) => setEditName(ev.target.value)} className="h-7 text-xs" /></td>
                    <td className="px-2 py-1"><Input value={editEmail} onChange={(ev) => setEditEmail(ev.target.value)} className="h-7 text-xs" /></td>
                    <td className="px-2 py-1">
                      <Select value={editBoxes} onValueChange={setEditBoxes}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1 text-right space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateEntrant.mutate(e.id)}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-foreground">{e.name}</td>
                    <td className="px-3 py-2 text-foreground/70">{e.email}</td>
                    <td className="px-3 py-2 text-center font-mono-display">{e.boxes_requested}</td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(e)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteEntrant.mutate(e.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
