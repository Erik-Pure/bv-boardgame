export function responsibleReminderAckKey(room: string): string {
  return `bv:responsibleReminderAck:${room}`;
}

export function mobileTutorialAckKey(room: string): string {
  return `bv:mobileTutorialAck:${room}`;
}
