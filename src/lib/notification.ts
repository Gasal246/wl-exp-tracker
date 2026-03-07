import { formatCurrency } from "@/lib/format";
import { firebaseMessaging } from "@/lib/firebase-admin";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

type ActorSnapshot = {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
  name: string;
  email: string;
  avatarUrl?: string | null;
};

type RecipientUser = {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
  fcmTokens?: string[];
};

type TransactionSnapshot = {
  id: string;
  description: string;
  type: "credit" | "debit";
  amountAdmin: number;
  amountEmployee: number;
  adminCurrency: string;
  employeeCurrency: string;
};

function buildFcmMessage(params: {
  eventType: "TRANSACTION_ADDED" | "BILL_ADDED";
  recipientRole: "ADMIN" | "EMPLOYEE";
  actorName: string;
  transactionType: "credit" | "debit";
  amountAdmin: number;
  amountEmployee: number;
  adminCurrency: string;
  employeeCurrency: string;
}) {
  const amount =
    params.recipientRole === "ADMIN"
      ? formatCurrency(params.amountAdmin, params.adminCurrency)
      : formatCurrency(params.amountEmployee, params.employeeCurrency);
  const typeLabel = params.transactionType.toUpperCase();
  const eventPrefix = params.eventType === "BILL_ADDED" ? "Bill added" : "Transaction added";

  return {
    title: params.eventType === "BILL_ADDED" ? "Bill Updated" : "New Transaction",
    body: `${eventPrefix} by ${params.actorName}: ${typeLabel} • ${amount}`,
  };
}

function buildNotificationLink(recipientRole: "ADMIN" | "EMPLOYEE", transactionId: string) {
  return recipientRole === "ADMIN"
    ? `/admin/transactions/${transactionId}`
    : `/employee/transactions/${transactionId}`;
}

export async function createNotificationAndSendFcm(params: {
  recipient: RecipientUser;
  actor: ActorSnapshot;
  eventType: "TRANSACTION_ADDED" | "BILL_ADDED";
  transaction: TransactionSnapshot;
}) {
  const { recipient, actor, eventType, transaction } = params;

  await Notification.create({
    recipientId: recipient.id,
    recipientRole: recipient.role,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    actorAvatarUrl: actor.avatarUrl ?? null,
    eventType,
    description: transaction.description,
    transactionType: transaction.type,
    amountAdmin: transaction.amountAdmin,
    amountEmployee: transaction.amountEmployee,
    adminCurrency: transaction.adminCurrency,
    employeeCurrency: transaction.employeeCurrency,
    refType: "TRANSACTION",
    refId: transaction.id,
    isSeen: false,
  });

  if (!recipient.fcmTokens?.length) {
    return;
  }

  try {
    const message = buildFcmMessage({
      eventType,
      recipientRole: recipient.role,
      actorName: actor.name,
      transactionType: transaction.type,
      amountAdmin: transaction.amountAdmin,
      amountEmployee: transaction.amountEmployee,
      adminCurrency: transaction.adminCurrency,
      employeeCurrency: transaction.employeeCurrency,
    });
    const link = buildNotificationLink(recipient.role, transaction.id);

    const result = await firebaseMessaging().sendEachForMulticast({
      tokens: recipient.fcmTokens,
      notification: message,
      webpush: {
        notification: {
          title: message.title,
          body: message.body,
          icon: "/icons/icon-192.png",
        },
        fcmOptions: {
          link,
        },
      },
      data: {
        type: "expense_notification",
        eventType,
        refType: "TRANSACTION",
        refId: transaction.id,
        link,
      },
    });

    if (result.failureCount > 0) {
      const invalidTokens: string[] = [];

      result.responses.forEach((entry, index) => {
        if (entry.success) return;
        const token = recipient.fcmTokens?.[index];
        if (!token) return;

        const code = entry.error?.code ?? "unknown";
        console.error("[FCM] Delivery failed", {
          code,
          recipientId: recipient.id,
          role: recipient.role,
        });

        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          invalidTokens.push(token);
        }
      });

      if (invalidTokens.length > 0) {
        await User.updateOne(
          { _id: recipient.id },
          { $pull: { fcmTokens: { $in: invalidTokens } } },
        );
      }
    }
  } catch (error) {
    console.error("[FCM] Multicast send failed", {
      recipientId: recipient.id,
      role: recipient.role,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}
