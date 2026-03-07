import Link from "next/link";

import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { Button } from "@/components/ui/button";

export default async function AdminTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <Button asChild variant="outline">
        <Link href="/admin/employees">Back</Link>
      </Button>
      <TransactionDetail transactionId={id} view="admin" editable />
    </div>
  );
}
