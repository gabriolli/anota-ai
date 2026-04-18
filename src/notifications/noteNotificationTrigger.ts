import type { ItemNote } from '../database/ItemNoteRepository';

export const DEFAULT_NOTIFY_TIME = '09:00';

export function timeStringToReferenceDate(hhmm: string): Date {
    const parts = hhmm.split(':').map(Number);
    const h = parts[0] ?? 9;
    const m = parts[1] ?? 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

export function dateToHHmm(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Aplica hora HH:mm (local) na data do calendário de `date`. */
export function applyTimeOnCalendarDate(date: Date, hhmm: string): Date {
    const parts = hhmm.split(':').map(Number);
    const h = parts[0] ?? 9;
    const m = parts[1] ?? 0;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
}

/**
 * Data/hora do disparo da notificação local, ou null se desligada / inválida.
 * Nota: expo-notifications precisa de data futura para agendar.
 */
export function getNotificationTriggerDate(note: ItemNote): Date | null {
    if (!note.notify_enabled || note.id == null) return null;

    if (note.notify_same_day) {
        if (!note.expires_at) return null;
        const t = applyTimeOnCalendarDate(
            note.expires_at,
            note.notify_same_day_time ?? DEFAULT_NOTIFY_TIME,
        );
        return t;
    }

    if (note.notify_custom_at) {
        return new Date(note.notify_custom_at);
    }

    return null;
}
