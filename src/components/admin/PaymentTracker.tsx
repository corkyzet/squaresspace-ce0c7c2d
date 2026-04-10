import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownLeft, Plus, Check, X, Trash2, Pencil } from "lucide-react";

interface PaymentTrackerProps {
  seasonId: string;
}

interface Payment {
  id: string;
  amount_cents: number;
  status: string;
  notes: string | null;
  paid_from: string | null;
  round: string | null;
  created_at: string;
  entrant_id: string;
}

interface Entrant {
  id: string;
  name: string;
  email: string;
  boxes_requested: number;
  who_will_pay: string | null;
  collected_by: string | null;
}

const COLLECTORS = [
  { value: "corey", label: "Corey" },
  { value: "joe", label: "Joe" },
  { value: "coop", label: "Coop" },
];

const ROUNDS = [
  { value: "R1", label: "R1" },
  { value: "R2", label: "R2" },
  { value: "SS", label: "SS" },
  { value: "EE", label: "EE" },
  { value: "FF", label: "FF" },
  { value: "F", label: "F" },
  { value: "Rev", label: "Rev" },
];

const PRICE_PER_BOX_CENTS = 10000;

export function PaymentTracker({ seasonId }: PaymentTrackerProps) {
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("season_id", seasonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });

  const { data: entrants = [] } = useQuery({
    queryKey: ["entrants", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrants")
        .select("id, name, email, boxes_requested, who_will_pay, collected_by")
        .eq("season_id", seasonId)
        .order("name");
      if (error) throw error;
      return data as Entrant[];
    },
  });

  function entrantName(id: string) {
    return entrants.find((e) => e.id === id)?.name ?? "Unknown";
  }

  return (
    <div className="space-y-8">
      <OutgoingPayments
        payments={payments}
        entrants={entrants}
        seasonId={seasonId}
        entrantName={entrantName}
        queryClient={queryClient}
      />
      <IncomingPayments
        entrants={entrants}
        seasonId={seasonId}
        queryClient={queryClient}
      />
      <SummaryTable
        payments={payments}
        entrants={entrants}
      />
    </div>
  );
}

/* ─── Outgoing Payments ─── */

function OutgoingPayments({
  payments,
  entrants,
  seasonId,
  entrantName,
  queryClient,
}: {
  payments: Payment[];
  entrants: Entrant[];
  seasonId: string;
  entrantName: (id: string) => string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaidFrom, setEditPaidFrom] = useState("");
  const [editRound, setEditRound] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addEntrantId, setAddEntrantId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addStatus, setAddStatus] = useState("unpaid");
  const [addNotes, setAddNotes] = useState("");
  const [addPaidFrom, setAddPaidFrom] = useState("");
  const [addRound, setAddRound] = useState("");

  function startEdit(p: Payment) {
    setEditingId(p.id);
    setEditStatus(p.status);
    setEditNotes(p.notes ?? "");
    setEditPaidFrom(p.paid_from ?? "none");
    setEditRound(p.round ?? "none");
  }

  const updatePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payments")
        .update({
          status: editStatus,
          notes: editNotes || null,
          paid_from: editPaidFrom === "none" ? null : editPaidFrom,
          round: editRound === "none" ? null : editRound,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", seasonId] });
      setEditingId(null);
      toast.success("Payment updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addPayment = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(addAmount) * 100);
      if (!addEntrantId || isNaN(cents) || cents <= 0) throw new Error("Fill in entrant and amount.");
      const { error } = await supabase.from("payments").insert({
        season_id: seasonId,
        entrant_id: addEntrantId,
        amount_cents: cents,
        status: addStatus,
        notes: addNotes || null,
        paid_from: addPaidFrom || null,
        round: addRound || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", seasonId] });
      setShowAdd(false);
      setAddEntrantId(""); setAddAmount(""); setAddStatus("unpaid");
      setAddNotes(""); setAddPaidFrom(""); setAddRound("");
      toast.success("Outgoing payment added.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", seasonId] });
      toast.success("Payment deleted.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const collectorLabel = (val: string | null) =>
    COLLECTORS.find((c) => c.value === val)?.label ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-destructive" /> Outgoing Payments
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {payments.length} records
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1 text-xs rounded-lg">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      {showAdd && (
        <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-white/[0.03] border border-[hsl(215_30%_16%)]">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Entrant</label>
            <Select value={addEntrantId} onValueChange={setAddEntrantId}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {entrants.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Amount ($)</label>
            <Input type="number" step="0.01" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="h-8 text-xs rounded-lg" required />
          </div>
          <div className="w-24">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Round</label>
            <Select value={addRound} onValueChange={setAddRound}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ROUNDS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Paid From</label>
            <Select value={addPaidFrom} onValueChange={setAddPaidFrom}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {COLLECTORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Status</label>
            <Select value={addStatus} onValueChange={setAddStatus}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Notes</label>
            <Input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} className="h-8 text-xs rounded-lg" placeholder="Optional" />
          </div>
          <Button size="sm" onClick={() => addPayment.mutate()} disabled={addPayment.isPending} className="h-8 text-xs">Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="h-8 text-xs">Cancel</Button>
        </div>
      )}

      <div className="border border-[hsl(215_30%_16%)] rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-left">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entrant</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Round</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paid From</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No outgoing payment records yet.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-[hsl(215_30%_14%)] hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2 text-foreground">{entrantName(p.entrant_id)}</td>
                <td className="px-3 py-2 text-right font-mono-display">${(p.amount_cents / 100).toFixed(0)}</td>
                {editingId === p.id ? (
                  <>
                    <td className="px-2 py-1">
                      <Select value={editRound} onValueChange={setEditRound}>
                        <SelectTrigger className="h-7 text-xs rounded-lg w-16"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {ROUNDS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1">
                      <Select value={editPaidFrom} onValueChange={setEditPaidFrom}>
                        <SelectTrigger className="h-7 text-xs rounded-lg w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {COLLECTORS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1">
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="h-7 text-xs rounded-lg w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1">
                      <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="h-7 text-xs rounded-lg" />
                    </td>
                    <td className="px-2 py-1 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updatePayment.mutate(p.id)}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      {p.round ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">{p.round}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground/70">{collectorLabel(p.paid_from)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                        p.status === "paid" ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground/70">{p.notes ?? "—"}</td>
                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => deletePayment.mutate(p.id)}>
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

/* ─── Incoming Payments ─── */

function IncomingPayments({
  entrants,
  seasonId,
  queryClient,
}: {
  entrants: Entrant[];
  seasonId: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const updateCollector = useMutation({
    mutationFn: async ({ entrantId, value }: { entrantId: string; value: string | null }) => {
      const { error } = await supabase
        .from("entrants")
        .update({ collected_by: value })
        .eq("id", entrantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrants", seasonId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const totalDue = entrants.reduce((sum, e) => sum + e.boxes_requested * PRICE_PER_BOX_CENTS, 0);
  const totalCollected = entrants.filter((e) => e.collected_by).reduce((sum, e) => sum + e.boxes_requested * PRICE_PER_BOX_CENTS, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <ArrowDownLeft className="w-4 h-4 text-accent" /> Incoming Payments
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          ${(totalCollected / 100).toLocaleString()} / ${(totalDue / 100).toLocaleString()} collected
        </span>
      </div>

      <div className="border border-[hsl(215_30%_16%)] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-left">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entrant</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Who Collected</th>
            </tr>
          </thead>
          <tbody>
            {entrants.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                  No entrants yet.
                </td>
              </tr>
            )}
            {entrants.map((e) => (
              <tr key={e.id} className="border-t border-[hsl(215_30%_14%)] hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2 text-foreground">
                  {e.name}
                  {e.who_will_pay && (
                    <span className="ml-2 text-[9px] text-muted-foreground">
                      (will pay {COLLECTORS.find((c) => c.value === e.who_will_pay)?.label ?? e.who_will_pay})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono-display">
                  ${((e.boxes_requested * PRICE_PER_BOX_CENTS) / 100).toFixed(0)}
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={e.collected_by ?? "none"}
                    onValueChange={(val) =>
                      updateCollector.mutate({ entrantId: e.id, value: val === "none" ? null : val })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs rounded-lg w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {COLLECTORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Summary Table ─── */

function SummaryTable({
  payments,
  entrants,
}: {
  payments: Payment[];
  entrants: Entrant[];
}) {
  const paidPayments = payments.filter((p) => p.status === "paid");

  const rows = COLLECTORS.map((c) => {
    const incomingCents = entrants
      .filter((e) => e.collected_by === c.value)
      .reduce((sum, e) => sum + e.boxes_requested * PRICE_PER_BOX_CENTS, 0);

    const roundTotals: Record<string, number> = {};
    for (const r of ROUNDS) {
      roundTotals[r.value] = paidPayments
        .filter((p) => p.paid_from === c.value && p.round === r.value)
        .reduce((sum, p) => sum + p.amount_cents, 0);
    }

    const totalPaidOut = Object.values(roundTotals).reduce((a, b) => a + b, 0);
    const remaining = incomingCents - totalPaidOut;

    return { ...c, incomingCents, roundTotals, remaining };
  });

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
        Collector Summary
      </h3>

      <div className="border border-[hsl(215_30%_16%)] rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-left">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Initial</th>
              {ROUNDS.map((r) => (
                <th key={r.value} className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  {r.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.value} className="border-t border-[hsl(215_30%_14%)]">
                <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                <td className="px-3 py-2.5 text-right font-mono-display text-foreground">{fmt(row.incomingCents)}</td>
                {ROUNDS.map((r) => (
                  <td key={r.value} className="px-2 py-2.5 text-right font-mono-display text-destructive/80">
                    {row.roundTotals[r.value] > 0 ? `-${fmt(row.roundTotals[r.value])}` : "—"}
                  </td>
                ))}
                <td className={`px-3 py-2.5 text-right font-mono-display font-bold ${
                  row.remaining >= 0 ? "text-accent" : "text-destructive"
                }`}>
                  {fmt(row.remaining)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
