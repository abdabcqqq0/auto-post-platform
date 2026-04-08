export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * 通知擁有者（Stub 版本）
 * 在自架環境中，此功能透過 Telegram 通知替代
 * 若需要其他通知管道，可在此擴充
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  // 靜默成功，避免影響主流程
  // Telegram 通知已在 autopost.ts 中獨立處理
  console.log(`[Notification] ${payload.title}: ${payload.content.slice(0, 100)}`);
  return true;
}
