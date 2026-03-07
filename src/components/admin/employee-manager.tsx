"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Eye, KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format";

type Employee = {
  id: string;
  name: string;
  email: string;
  currency: string;
  avatarUrl?: string | null;
  currentBalance?: number;
};

function getInitials(name: string, email: string) {
  const fallback = email.slice(0, 2);
  if (!name.trim()) return fallback.toUpperCase();
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || fallback.toUpperCase();
}

export function EmployeeManager() {
  const [items, setItems] = useState<Employee[]>([]);
  const [adminCurrency, setAdminCurrency] = useState("AED");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [resetDialogEmployeeId, setResetDialogEmployeeId] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/employees", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load employees");
      setItems(payload.employees);
      setAdminCurrency((payload.adminCurrency as string) || "AED");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      const tempPassword = sessionStorage.getItem("newEmployeeTempPassword");
      if (tempPassword) {
        toast.success(`Employee created. Temporary password: ${tempPassword}`);
        sessionStorage.removeItem("newEmployeeTempPassword");
      }

      params.delete("created");
      const next = params.toString();
      window.history.replaceState({}, "", next ? `?${next}` : window.location.pathname);
    }
  }, []);

  async function updateEmployee() {
    if (!editing) return;

    try {
      const response = await fetch(`/api/admin/employees/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          email: editing.email,
          currency: editing.currency,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update employee");

      toast.success("Employee updated");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update employee");
    }
  }

  async function deleteEmployee(id: string) {
    try {
      const response = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete employee");

      toast.success("Employee removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete employee");
    }
  }

  async function resetEmployeePassword(id: string) {
    setResetLoading(true);
    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to reset password");

      setGeneratedPassword(payload.temporaryPassword);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  }

  async function copyPassword() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success("Password Copied");
    } catch {
      toast.error("Unable to copy password");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee Management</CardTitle>
          <Button asChild>
            <Link href="/admin/employees/new">Add Employee</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card className="border-white/70 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employees</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto [webkit-overflow-scrolling:touch]">
            <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Current Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Avatar size="sm">
                      <AvatarImage src={employee.avatarUrl ?? undefined} alt={employee.name} />
                      {!employee.avatarUrl ? (
                        <AvatarFallback>{getInitials(employee.name, employee.email)}</AvatarFallback>
                      ) : null}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/employees/${employee.id}`} className="font-medium hover:underline">
                      {employee.name}
                    </Link>
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.currency}</TableCell>
                  <TableCell>{formatCurrency(employee.currentBalance ?? 0, adminCurrency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="outline" size="icon">
                            <Link href={`/admin/employees/${employee.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Employee</TooltipContent>
                      </Tooltip>

                      <Dialog
                        open={resetDialogEmployeeId === employee.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setResetDialogEmployeeId(employee.id);
                            setGeneratedPassword(null);
                          } else {
                            setResetDialogEmployeeId(null);
                            setGeneratedPassword(null);
                            setResetLoading(false);
                          }
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <KeyRound className="size-4" />
                              </Button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Reset Password</TooltipContent>
                        </Tooltip>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset employee password?</DialogTitle>
                            <DialogDescription>
                              A new temporary password will be generated for {employee.name}.
                            </DialogDescription>
                          </DialogHeader>
                          {generatedPassword && resetDialogEmployeeId === employee.id && (
                            <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                              <p className="font-mono text-sm">{generatedPassword}</p>
                              <Button size="sm" variant="outline" onClick={() => void copyPassword()}>
                                <Copy className="mr-2 size-4" />
                                Copy
                              </Button>
                            </div>
                          )}
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button disabled={resetLoading} onClick={() => void resetEmployeePassword(employee.id)}>
                              {resetLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                              Proceed
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={editing?.id === employee.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setEditing(employee);
                          } else {
                            setEditing(null);
                          }
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Pencil className="size-4" />
                              </Button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Edit Employee</TooltipContent>
                        </Tooltip>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Employee</DialogTitle>
                            <DialogDescription>Update employee details and proceed to save.</DialogDescription>
                          </DialogHeader>
                          {editing && (
                            <div className="space-y-3">
                              <Input
                                value={editing.name}
                                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                                placeholder="Name"
                              />
                              <Input
                                value={editing.email}
                                onChange={(event) => setEditing({ ...editing, email: event.target.value })}
                                placeholder="Email"
                              />
                              <Input
                                value={editing.currency}
                                maxLength={3}
                                onChange={(event) =>
                                  setEditing({ ...editing, currency: event.target.value.toUpperCase() })
                                }
                                placeholder="Currency"
                              />
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                            <Button onClick={() => void updateEmployee()}>Proceed</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="size-4" />
                              </Button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Delete Employee</TooltipContent>
                        </Tooltip>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete employee?</DialogTitle>
                            <DialogDescription>
                              This will deactivate {employee.name} and remove access.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button variant="destructive" onClick={() => void deleteEmployee(employee.id)}>
                                Proceed
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>

          {!items.length && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">No employees created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
