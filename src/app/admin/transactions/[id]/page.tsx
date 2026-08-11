import Link from "next/link";

import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { Button } from "@/components/ui/button";

export default async function AdminTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/admin/employees">Back</Link>
        </Button>
        <DeleteTransactionButton transactionId={id} redirectTo="/admin/employees" />
      </div>
      <TransactionDetail transactionId={id} view="admin" editable />
    </div>
  );
}
