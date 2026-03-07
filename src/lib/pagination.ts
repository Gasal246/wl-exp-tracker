import { Types } from "mongoose";

export type Cursor = {
  time: string;
  id: string;
};

export function encodeCursor(value: Cursor) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor(cursor: string | null) {
  if (!cursor) return null;

  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
  } catch {
    return null;
  }
}

export function buildCursorFilter(cursor: string | null) {
  const parsed = decodeCursor(cursor);
  if (!parsed) return {};

  const cursorDate = new Date(parsed.time);
  const cursorId = new Types.ObjectId(parsed.id);

  return {
    $or: [
      { transactionAt: { $lt: cursorDate } },
      { transactionAt: cursorDate, _id: { $lt: cursorId } },
    ],
  };
}
