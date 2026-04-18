/**
 * Lembretes locais (expo-notifications). Não funciona na web; no Expo Go há limitações — dev build recomendado.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { ItemNote } from '../database/ItemNoteRepository';
import { getNotificationTriggerDate } from './noteNotificationTrigger';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const CHANNEL_ID = 'anota-ai-reminders';

let channelEnsured = false;

async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android' || channelEnsured) return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Lembretes',
        importance: AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
    });
    channelEnsured = true;
}

export function notificationIdentifier(noteId: number): string {
    return `note-${noteId}`;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === 'granted';
}

export async function cancelNoteNotification(noteId: number): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(notificationIdentifier(noteId));
}

export async function scheduleNoteNotification(note: ItemNote): Promise<void> {
    if (Platform.OS === 'web' || note.id == null) return;

    await ensureAndroidChannel();
    const id = note.id;
    await cancelNoteNotification(id);

    if (!note.notify_enabled) return;

    const when = getNotificationTriggerDate(note);
    if (!when || when.getTime() <= Date.now()) return;

    const granted = await ensureNotificationPermissions();
    if (!granted) return;

    const title = note.item_name?.trim() || 'Anota Aí';
    const body = note.expires_at
        ? `Lembrete · vencimento ${note.expires_at.toLocaleDateString('pt-BR')}`
        : 'Lembrete da sua anotação';

    await Notifications.scheduleNotificationAsync({
        identifier: notificationIdentifier(id),
        content: {
            title,
            body,
            data: { noteId: id },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
            channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        },
    });
}
