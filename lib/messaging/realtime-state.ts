export function upsertMessageById<T extends { id: string }>(messages: T[], incoming: T): T[] {
  const existingIndex = messages.findIndex((message) => message.id === incoming.id)
  if (existingIndex === -1) return [...messages, incoming]

  return messages.map((message, index) =>
    index === existingIndex ? { ...message, ...incoming } : message,
  )
}
