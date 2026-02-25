"use client";
import { useEffect, useState } from "react";
import { Plus, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { bookingsApi, equipmentApi } from "@/lib/api";
import { Booking, Equipment } from "@/types";
import { isAdmin, getUser } from "@/lib/auth";
import { cn, STATUS_COLORS, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function CreateBookingForm({ onSave, onClose }: { onSave: (data: any) => Promise<void>; onClose: () => void }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [form, setForm] = useState({
    equipment_id: "",
    quantity: 1,
    start_time: "",
    end_time: "",
    purpose: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    equipmentApi.list({ status: "available" }).then((r) => setEquipment(r.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSave({
        ...form,
        equipment_id: parseInt(form.equipment_id),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      });
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
      <div className="space-y-2">
        <Label>Equipment *</Label>
        <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
          <SelectContent>
            {equipment.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.name} (Available: {e.available_quantity}/{e.quantity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quantity *</Label>
        <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Time *</Label>
          <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>End Time *</Label>
          <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Purpose</Label>
        <Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Describe the purpose of this booking..." rows={3} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading || !form.equipment_id}>{loading ? "Creating..." : "Create Booking"}</Button>
      </DialogFooter>
    </form>
  );
}

function AdminNotesDialog({ booking, onSave, onClose }: { booking: Booking; onSave: (status: string, notes: string) => Promise<void>; onClose: () => void }) {
  const [notes, setNotes] = useState(booking.admin_notes || "");
  const [action, setAction] = useState<"approved" | "rejected">("approved");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSave(action, notes);
    setLoading(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Action</Label>
        <div className="flex gap-3">
          <button
            className={cn("flex-1 py-2 rounded-md border text-sm font-medium transition-colors", action === "approved" ? "bg-green-600 text-white border-green-600" : "border-gray-200 hover:bg-gray-50")}
            onClick={() => setAction("approved")}
          >
            Approve
          </button>
          <button
            className={cn("flex-1 py-2 rounded-md border text-sm font-medium transition-colors", action === "rejected" ? "bg-red-600 text-white border-red-600" : "border-gray-200 hover:bg-gray-50")}
            onClick={() => setAction("rejected")}
          >
            Reject
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Admin Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add notes..." />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
        >
          {loading ? "Saving..." : `Confirm ${action === "approved" ? "Approval" : "Rejection"}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const admin = isAdmin();
  const user = getUser();

  const load = async () => {
    setLoading(true);
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    const res = await bookingsApi.list(params);
    setBookings(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async (data: any) => {
    await bookingsApi.create(data);
    await load();
  };

  const handleReview = async (status: string, notes: string) => {
    if (!reviewBooking) return;
    await bookingsApi.update(reviewBooking.id, { status, admin_notes: notes });
    await load();
  };

  const handleCancel = async (id: number) => {
    await bookingsApi.update(id, { status: "cancelled" });
    await load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage equipment reservations</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Booking
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{b.equipment?.name || "—"}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[b.status])}>
                        {b.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">User: </span>
                        <span className="font-medium">{b.user?.full_name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Qty: </span>
                        <span className="font-medium">{b.quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Start: </span>
                        <span className="font-medium">{formatDate(b.start_time)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End: </span>
                        <span className="font-medium">{formatDate(b.end_time)}</span>
                      </div>
                    </div>
                    {b.purpose && <p className="text-sm text-muted-foreground mt-2">Purpose: {b.purpose}</p>}
                    {b.admin_notes && <p className="text-sm text-orange-600 mt-1">Note: {b.admin_notes}</p>}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {admin && b.status === "pending" && (
                      <Button size="sm" onClick={() => setReviewBooking(b)}>
                        Review
                      </Button>
                    )}
                    {(b.user_id === user?.id || admin) && b.status === "pending" && (
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleCancel(b.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {bookings.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No bookings found</div>
          )}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Booking</DialogTitle></DialogHeader>
          <CreateBookingForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewBooking} onOpenChange={() => setReviewBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Booking — {reviewBooking?.equipment?.name}</DialogTitle>
          </DialogHeader>
          {reviewBooking && (
            <AdminNotesDialog
              booking={reviewBooking}
              onSave={handleReview}
              onClose={() => setReviewBooking(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
