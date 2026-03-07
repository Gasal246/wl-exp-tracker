"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminRow = {
  id: string;
  name: string;
  email: string;
  currency: string;
  createdAt: string;
};

export function AdminManager() {
  const [items, setItems] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("AED");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/admins", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load admins");
      setItems(payload.admins);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAdmin() {
    try {
      const response = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, currency }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create admin");

      toast.success(`Admin created. Temporary password: ${payload.temporaryPassword}`);
      setName("");
      setEmail("");
      setCurrency("AED");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create admin");
    }
  }

  async function deleteAdmin(id: string) {
    try {
      const response = await fetch(`/api/super-admin/admins/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete admin");
      toast.success("Admin removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete admin");
    }
  }

  async function resetPassword(id: string) {
    try {
      const response = await fetch(`/api/super-admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to reset password");
      toast.success(`Temporary password: ${payload.temporaryPassword}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Create Admin</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Admin Name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          </div>
          <div className="flex items-end">
            <Button onClick={createAdmin} className="w-full">Create Admin</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Admins</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.currency}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => void resetPassword(admin.id)}>
                        <RotateCcw className="mr-1 size-4" /> Reset Password
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-1 size-4" /> Remove
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete {admin.name}?</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground">This deactivates the admin and linked employees.</p>
                          <Button variant="destructive" onClick={() => void deleteAdmin(admin.id)}>
                            Confirm Delete
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!items.length && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">No admins yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
