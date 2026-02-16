import { UIMessage as Message } from "ai";

interface StorageReader {
    getItem(key: string): string | null;
}

export function parseStoredMessages(raw: string | null): Message[] {
    if (!raw) return [];

    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Message[]) : [];
    } catch {
        return [];
    }
}

export function loadMessagesFromStorage(
    storage: StorageReader | null | undefined,
    storageKey: string
): Message[] {
    if (!storage) return [];
    return parseStoredMessages(storage.getItem(storageKey));
}
