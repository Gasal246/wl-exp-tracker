# Expense Tracker (Petty Cash)

A role-based petty-cash and expense tracking platform built with:

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- MongoDB (Mongoose)
- Firebase Storage (bill/avatar uploads)
- Firebase Cloud Messaging (petty cash notifications)
- Excel export (`xlsx`)

## Roles

- `SUPER_ADMIN`
  - Manages Admin users only.
- `ADMIN`
  - Manages employees under them.
  - Adds/edit/deletes employees.
  - Adds/edits employee transactions.
  - Sees dashboard totals and trend graph.
  - Exports monthly/date-range Excel reports.
- `EMPLOYEE`
  - Adds debit (expense) or credit (cash in hand) transactions.
  - Mobile-friendly transaction feed.
  - Uploads bill images now or later

## Setup

1. Install dependencies:

```bash
npm install
```

2. Environment:

- `.env.local` is already prepared in this workspace.
- `.env.example` is included for reference.

3. Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Create First Super Admin (manual, required)

`SUPER_ADMIN` must be inserted manually in `superadmins` collection.

1. Generate password hash:

```bash
npm run hash-password -- 'AStrongPassword!'
```

2. Insert into MongoDB `superadmins` collection:

```json
{
  "name": "Main Super Admin",
  "email": "superadmin@company.com",
  "passwordHash": "<paste-generated-hash>",
  "currency": "AED"
}
```

3. Sign in with that email/password at `/login`.

## Main Routes

- `/login`
- `/super-admin`
- `/admin`
- `/admin/employees`
- `/admin/employees/:id`
- `/admin/employees/:id/transactions`
- `/employee`
- `/employee/transactions`
- `/employee/transactions/:id`

## Notes

- Employee mobile UI uses card-based transaction feed (no table).
- Infinite loading is enabled on “View All” transaction pages.
- Bill image can be uploaded when creating or later from transaction details.
- Petty cash credit triggers FCM notification when employee has a registered device token.
