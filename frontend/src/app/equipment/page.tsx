"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, FlaskConical } from "lucide-react";
import { equipmentApi } from "@/lib/api";
import { Equipment } from "@/types";
import { isAdmin } from "@/lib/auth";
import { cn, STATUS_COLORS, formatDateOnly } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIES = ["Microscope", "Centrifuge", "Spectrometer", "PCR Machine", "Incubator", "Pipette", "Other"];

function EquipmentForm({
  initial, onSave, onClose,
}: {
  initial?: Partial<Equipment>;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    category: initial?.category || "Other",
    description: initial?.description || "",
    quantity: initial?.quantity || 1,
    status: initial?.status || "available",
    location: initial?.location || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Equipment["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quantity *</Label>
          <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })} required />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lab A, Room 101" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const admin = isAdmin();

  const load = async () => {
    setLoading(true);
    const res = await equipmentApi.list();
    setEquipment(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = equipment.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (data: any) => {
    if (editing) {
      await equipmentApi.update(editing.id, data);
    } else {
      await equipmentApi.create(data);
    }
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await equipmentApi.delete(deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-muted-foreground mt-1">Manage laboratory equipment inventory</p>
        </div>
        {admin && (
          <Button onClick={() => { setEditing(null); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Equipment
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((eq) => (
            <Card key={eq.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FlaskConical className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{eq.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{eq.category}</p>
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[eq.status])}>
                    {eq.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {eq.description && <p className="text-sm text-gray-600 line-clamp-2">{eq.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium">{eq.quantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available: </span>
                    <span className={cn("font-medium", eq.available_quantity === 0 ? "text-red-600" : "text-green-600")}>
                      {eq.available_quantity}
                    </span>
                  </div>
                  {eq.location && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Location: </span>
                      <span className="font-medium">{eq.location}</span>
                    </div>
                  )}
                </div>
                {admin && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm" variant="outline" className="flex-1"
                      onClick={() => { setEditing(eq); setShowDialog(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1"
                      onClick={() => setDeleteId(eq.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              No equipment found
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            initial={editing || undefined}
            onSave={handleSave}
            onClose={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this equipment? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
