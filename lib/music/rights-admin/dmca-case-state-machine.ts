export type DmcaStatus = "received" | "needs_information" | "validated" | "disabled" | "uploader_notified" | "counter_received" | "counter_validated" | "court_action_hold" | "restored" | "closed";
export interface RestorationWindow { earliest: Date; latest: Date; }
export function counterNoticeRestorationWindow(receivedAt: Date, addBusinessDays: (date: Date, days: number) => Date): RestorationWindow {
  return { earliest: addBusinessDays(receivedAt, 10), latest: addBusinessDays(receivedAt, 14) };
}
