import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ItemNoteRepository from '../database/ItemNoteRepository';
import { persistPickerImage, removeNoteImage } from '../lib/noteImageStorage';
import {
    dateToHHmm,
    timeStringToReferenceDate,
} from '../notifications/noteNotificationTrigger';
import {
    cancelNoteNotification,
    ensureNotificationPermissions,
    scheduleNoteNotification,
} from '../notifications/noteNotificationScheduler';
import { NoteNotificationSection } from './NoteNotificationSection';
import { colors, radii, space } from '../theme/upTodoTheme';

type Props = {
    noteId?: number;
};

export function NoteEditor({ noteId }: Props) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isEdit = noteId != null;

    const [loading, setLoading] = useState(isEdit);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [hasReturnDate, setHasReturnDate] = useState(false);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [storedImageUri, setStoredImageUri] = useState<string | null>(null);
    const [pendingPickerUri, setPendingPickerUri] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const [notifyEnabled, setNotifyEnabled] = useState(false);
    const [sameDay, setSameDay] = useState(false);
    const [sameDayTime, setSameDayTime] = useState(() =>
        timeStringToReferenceDate('09:00'),
    );
    const [customMode, setCustomMode] = useState(false);
    const [customAt, setCustomAt] = useState<Date | null>(null);

    const load = useCallback(async () => {
        if (noteId == null) return;
        setLoading(true);
        try {
            const note = await ItemNoteRepository.getById(noteId);
            if (!note) {
                Alert.alert('Não encontrado', 'Esta anotação não existe.');
                router.back();
                return;
            }
            setName(note.item_name ?? '');
            setDescription(note.item_description ?? '');
            if (note.expires_at) {
                setExpiresAt(note.expires_at);
                setHasReturnDate(true);
            } else {
                setExpiresAt(null);
                setHasReturnDate(false);
            }
            const img = note.item_img_uri ?? null;
            setStoredImageUri(img);
            setPreviewUri(img);
            setPendingPickerUri(null);

            setNotifyEnabled(note.notify_enabled ?? false);
            setSameDay(note.notify_same_day ?? false);
            setSameDayTime(
                timeStringToReferenceDate(note.notify_same_day_time ?? '09:00'),
            );
            const hasCustom = !!(note.notify_custom_at && !note.notify_same_day);
            setCustomMode(hasCustom);
            setCustomAt(note.notify_custom_at ?? null);
        } finally {
            setLoading(false);
        }
    }, [noteId, router]);

    useEffect(() => {
        void load();
    }, [load]);

    const pickFromLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão', 'Precisamos da galeria para anexar uma foto.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.75,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            setPendingPickerUri(result.assets[0].uri);
            setPreviewUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão', 'Precisamos da câmera para tirar a foto.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
        if (!result.canceled && result.assets[0]?.uri) {
            setPendingPickerUri(result.assets[0].uri);
            setPreviewUri(result.assets[0].uri);
        }
    };

    const clearPhoto = () => {
        setPreviewUri(null);
        setPendingPickerUri(null);
    };

    const onDateChange = (event: { type?: string } | undefined, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (event?.type === 'dismissed') {
            return;
        }
        if (date) setExpiresAt(date);
    };

    const resolveImageForSave = async (): Promise<string | null> => {
        if (!previewUri) return null;
        if (pendingPickerUri) {
            return persistPickerImage(pendingPickerUri);
        }
        return storedImageUri;
    };

    const validateNotifications = (): boolean => {
        if (!notifyEnabled) return true;
        if (sameDay) {
            if (!hasReturnDate || !expiresAt) {
                Alert.alert(
                    'Data de vencimento',
                    'Para "Lembrar no dia", defina a data de vencimento.',
                );
                return false;
            }
            return true;
        }
        if (customMode) {
            if (!customAt) {
                Alert.alert('Notificação', 'Escolha data e horário.');
                return false;
            }
            if (customAt.getTime() <= Date.now()) {
                Alert.alert('Notificação', 'Use uma data e horário futuros.');
                return false;
            }
            return true;
        }
        Alert.alert(
            'Notificações',
            'Marque "Lembrar no dia" ou "Escolher data da notificação".',
        );
        return false;
    };

    const buildNotifyFields = () => {
        if (!notifyEnabled) {
            return {
                notify_enabled: false,
                notify_same_day: false,
                notify_same_day_time: '09:00',
                notify_custom_at: undefined,
            };
        }
        if (sameDay) {
            return {
                notify_enabled: true,
                notify_same_day: true,
                notify_same_day_time: dateToHHmm(sameDayTime),
                notify_custom_at: undefined,
            };
        }
        return {
            notify_enabled: true,
            notify_same_day: false,
            notify_same_day_time: '09:00',
            notify_custom_at: customAt!,
        };
    };

    const save = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert('Nome', 'Informe um nome para o item.');
            return;
        }
        if (!validateNotifications()) return;
        if (notifyEnabled) {
            const ok = await ensureNotificationPermissions();
            if (!ok) {
                Alert.alert(
                    'Permissão',
                    'Sem permissão de notificação o lembrete não será agendado. Os dados serão salvos.',
                );
            }
        }

        setSaving(true);
        try {
            let imagePath: string | null = null;
            if (previewUri) {
                imagePath = await resolveImageForSave();
            }

            if (isEdit && noteId != null) {
                const previousStored = storedImageUri;
                if (previousStored && previousStored !== imagePath) {
                    await removeNoteImage(previousStored);
                }
                if (!previewUri && previousStored) {
                    await removeNoteImage(previousStored);
                    imagePath = null;
                }
            }

            const notify = buildNotifyFields();
            const base = {
                item_name: trimmed,
                item_description: description.trim() || undefined,
                item_img_uri: imagePath ?? undefined,
                expires_at: hasReturnDate && expiresAt ? expiresAt : undefined,
                ...notify,
            };

            let savedId: number;

            if (isEdit && noteId != null) {
                await ItemNoteRepository.updateItemNote({
                    id: noteId,
                    ...base,
                });
                savedId = noteId;
            } else {
                const newId = await ItemNoteRepository.createItemNote(base);
                if (newId == null) {
                    throw new Error('Falha ao criar anotação.');
                }
                savedId = Number(newId);
            }

            const saved = await ItemNoteRepository.getById(savedId);
            if (saved) await scheduleNoteNotification(saved);

            router.back();
        } catch (e) {
            Alert.alert(
                'Erro',
                e instanceof Error ? e.message : 'Não foi possível salvar.',
            );
        } finally {
            setSaving(false);
        }
    };

    const remove = () => {
        if (noteId == null) return;
        Alert.alert('Excluir', 'Remover esta anotação?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelNoteNotification(noteId);
                        const note = await ItemNoteRepository.getById(noteId);
                        if (note?.item_img_uri) {
                            await removeNoteImage(note.item_img_uri);
                        }
                        await ItemNoteRepository.deleteItem(noteId);
                        router.back();
                    } catch (e) {
                        Alert.alert(
                            'Erro',
                            e instanceof Error ? e.message : 'Não foi possível excluir.',
                        );
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={[
                styles.content,
                { paddingBottom: insets.bottom + space.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.section}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex.: Livro — Design do dia a dia"
                    placeholderTextColor={colors.textDim}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Descrição</Text>
                <Text style={styles.hint}>Opcional · detalhes ou lembrete</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Local da biblioteca, capítulo..."
                    placeholderTextColor={colors.textDim}
                    multiline
                />
            </View>

            <View style={styles.section}>
                <View style={styles.rowBetween}>
                    <Text style={styles.label}>Data de vencimento</Text>
                    <Pressable
                        hitSlop={8}
                        onPress={() => {
                            setHasReturnDate(h => !h);
                            if (!hasReturnDate && !expiresAt) {
                                setExpiresAt(new Date());
                            }
                        }}
                    >
                        <Text style={styles.link}>
                            {hasReturnDate ? 'Desativar' : 'Ativar'}
                        </Text>
                    </Pressable>
                </View>
                {hasReturnDate ? (
                    <>
                        <Pressable
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar" size={20} color={colors.accent} />
                            <Text style={styles.dateButtonText}>
                                {expiresAt
                                    ? expiresAt.toLocaleDateString('pt-BR', {
                                          weekday: 'short',
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                      })
                                    : 'Escolher data'}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={18}
                                color={colors.textDim}
                            />
                        </Pressable>
                        {showDatePicker ? (
                            <>
                                <DateTimePicker
                                    value={expiresAt ?? new Date()}
                                    mode="date"
                                    display={
                                        Platform.OS === 'ios' ? 'spinner' : 'default'
                                    }
                                    onChange={onDateChange}
                                    locale="pt-BR"
                                    themeVariant="dark"
                                />
                                {Platform.OS === 'ios' ? (
                                    <Pressable
                                        style={styles.iosDateClose}
                                        onPress={() => setShowDatePicker(false)}
                                    >
                                        <Text style={styles.link}>Concluir</Text>
                                    </Pressable>
                                ) : null}
                            </>
                        ) : null}
                    </>
                ) : null}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Foto</Text>
                <View style={styles.photoRow}>
                    <Pressable style={styles.chip} onPress={pickFromLibrary}>
                        <Ionicons name="images-outline" size={18} color={colors.text} />
                        <Text style={styles.chipText}>Galeria</Text>
                    </Pressable>
                    <Pressable style={styles.chip} onPress={takePhoto}>
                        <Ionicons name="camera-outline" size={18} color={colors.text} />
                        <Text style={styles.chipText}>Câmera</Text>
                    </Pressable>
                    {previewUri ? (
                        <Pressable
                            style={[styles.chip, styles.chipDanger]}
                            onPress={clearPhoto}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={18}
                                color={colors.danger}
                            />
                            <Text style={[styles.chipText, styles.chipDangerText]}>
                                Remover
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
                {previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.preview} />
                ) : (
                    <View style={styles.previewPlaceholder}>
                        <Ionicons name="image-outline" size={36} color={colors.textDim} />
                        <Text style={styles.previewHint}>Nenhuma imagem</Text>
                    </View>
                )}
            </View>

            <NoteNotificationSection
                notifyEnabled={notifyEnabled}
                onNotifyEnabledChange={v => {
                    setNotifyEnabled(v);
                    if (v) void ensureNotificationPermissions();
                }}
                sameDay={sameDay}
                onSameDayChange={setSameDay}
                sameDayTime={sameDayTime}
                onSameDayTimeChange={setSameDayTime}
                customMode={customMode}
                onCustomModeChange={setCustomMode}
                customAt={customAt}
                onCustomAtChange={setCustomAt}
                hasExpiresAt={hasReturnDate && expiresAt != null}
            />

            <Pressable
                style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                    saving && styles.primaryBtnDisabled,
                ]}
                onPress={() => void save()}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color={colors.text} />
                ) : (
                    <>
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.text}
                            style={styles.primaryIcon}
                        />
                        <Text style={styles.primaryBtnText}>Salvar</Text>
                    </>
                )}
            </Pressable>

            {isEdit ? (
                <Pressable style={styles.dangerBtn} onPress={remove}>
                    <Text style={styles.dangerBtnText}>Excluir anotação</Text>
                </Pressable>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    content: {
        paddingHorizontal: space.md,
        paddingTop: space.md,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
    },
    section: {
        marginBottom: space.lg,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: space.xs,
    },
    hint: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: space.sm,
        marginTop: -2,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.sm,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
    },
    multiline: {
        minHeight: 108,
        textAlignVertical: 'top',
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space.sm,
    },
    link: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.sm,
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    dateButtonText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    iosDateClose: {
        marginTop: space.sm,
        alignItems: 'center',
    },
    photoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space.sm,
        marginBottom: space.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surfaceModal,
        borderRadius: radii.sm,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    chipDanger: {
        backgroundColor: colors.dangerSoft,
        borderColor: 'transparent',
    },
    chipDangerText: {
        color: colors.danger,
    },
    preview: {
        width: '100%',
        height: 200,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
    },
    previewPlaceholder: {
        width: '100%',
        height: 160,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewHint: {
        marginTop: space.xs,
        fontSize: 13,
        color: colors.textDim,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        borderRadius: radii.sm,
        paddingVertical: 16,
        marginTop: space.sm,
    },
    primaryBtnPressed: {
        backgroundColor: colors.accentPressed,
    },
    primaryBtnDisabled: {
        opacity: 0.65,
    },
    primaryIcon: {
        marginRight: 8,
    },
    primaryBtnText: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
    },
    dangerBtn: {
        marginTop: space.md,
        paddingVertical: 14,
        alignItems: 'center',
    },
    dangerBtnText: {
        color: colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
});
