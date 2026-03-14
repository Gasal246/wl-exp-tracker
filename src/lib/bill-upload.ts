export const BILL_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
export const BILL_UPLOAD_TARGET_BYTES = 1024 * 1024;

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}
