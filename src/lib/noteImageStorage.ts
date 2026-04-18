import {
    copyAsync,
    deleteAsync,
    documentDirectory,
    getInfoAsync,
    makeDirectoryAsync,
} from 'expo-file-system/legacy';

const NOTES_DIR = `${documentDirectory ?? ''}note-images/`;

function randomSuffix(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureNotesImageDir(): Promise<void> {
    if (!documentDirectory) return;
    const info = await getInfoAsync(NOTES_DIR);
    if (!info.exists) {
        await makeDirectoryAsync(NOTES_DIR, { intermediates: true });
    }
}

/** Copies a temporary picker/camera URI into app storage; returns persistent file URI. */
export async function persistPickerImage(sourceUri: string): Promise<string> {
    if (!documentDirectory) {
        throw new Error('Armazenamento local não disponível nesta plataforma.');
    }
    await ensureNotesImageDir();
    const dest = `${NOTES_DIR}img_${randomSuffix()}.jpg`;
    await copyAsync({ from: sourceUri, to: dest });
    return dest;
}

/** Deletes a stored note image if it lives under our notes directory. */
export async function removeNoteImage(uri: string | undefined | null): Promise<void> {
    if (!uri || !documentDirectory) return;
    if (!uri.startsWith(NOTES_DIR)) return;
    try {
        const info = await getInfoAsync(uri);
        if (info.exists) {
            await deleteAsync(uri, { idempotent: true });
        }
    } catch {
        // ignore missing or permission issues
    }
}
