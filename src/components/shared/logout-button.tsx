"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
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

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size={compact ? "icon" : "sm"} className="cursor-pointer">
          <LogOut className="size-4" />
          {!compact && <span>Sign out</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>You will need to sign in again to continue.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => void handleSignOut()}>Proceed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
