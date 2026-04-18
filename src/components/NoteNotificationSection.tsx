import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { dateToHHmm } from '../notifications/noteNotificationTrigger';
import { colors, radii, space } from '../theme/upTodoTheme';

type Props = {
    notifyEnabled: boolean;
    onNotifyEnabledChange: (v: boolean) => void;
    sameDay: boolean;
    onSameDayChange: (v: boolean) => void;
    sameDayTime: Date;
    onSameDayTimeChange: (d: Date) => void;
    customMode: boolean;
    onCustomModeChange: (v: boolean) => void;
    customAt: Date | null;
    onCustomAtChange: (d: Date) => void;
    hasExpiresAt: boolean;
};

export function NoteNotificationSection({
    notifyEnabled,
    onNotifyEnabledChange,
    sameDay,
    onSameDayChange,
    sameDayTime,
    onSameDayTimeChange,
    customMode,
    onCustomModeChange,
    customAt,
    onCustomAtChange,
    hasExpiresAt,
}: Props) {
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const toggleSameDay = () => {
        const next = !sameDay;
        onSameDayChange(next);
        if (next) onCustomModeChange(false);
    };

    const toggleCustom = () => {
        const next = !customMode;
        onCustomModeChange(next);
        if (next) {
            onSameDayChange(false);
            if (!customAt) {
                onCustomAtChange(new Date(Date.now() + 60 * 60 * 1000));
            }
        }
    };

    const customDisabled = sameDay;
    const sameDayDisabled = customMode;

    return (
        <View style={styles.section}>
            <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                    <Text style={styles.label}>Notificações</Text>
                    <Text style={styles.hint}>Lembrete local neste aparelho</Text>
                </View>
                <Switch
                    value={notifyEnabled}
                    onValueChange={onNotifyEnabledChange}
                    trackColor={{ false: colors.border, true: colors.accentSoft }}
                    thumbColor={notifyEnabled ? colors.accent : colors.textDim}
                />
            </View>

            {notifyEnabled ? (
                <View style={styles.options}>
                    <Pressable
                        style={[
                            styles.checkRow,
                            sameDayDisabled && styles.checkRowDisabled,
                        ]}
                        onPress={() => !sameDayDisabled && toggleSameDay()}
                        disabled={sameDayDisabled}
                    >
                        <Ionicons
                            name={sameDay ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={
                                sameDayDisabled
                                    ? colors.textDim
                                    : sameDay
                                      ? colors.accent
                                      : colors.textMuted
                            }
                        />
                        <Text
                            style={[styles.checkLabel, sameDayDisabled && styles.muted]}
                        >
                            Lembrar no dia
                        </Text>
                    </Pressable>
                    {sameDay ? (
                        <>
                            <Pressable
                                style={styles.timeButton}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={colors.accent}
                                />
                                <Text style={styles.timeButtonText}>
                                    Horário: {dateToHHmm(sameDayTime)}
                                </Text>
                            </Pressable>
                            {showTimePicker ? (
                                <>
                                    <DateTimePicker
                                        value={sameDayTime}
                                        mode="time"
                                        display={
                                            Platform.OS === 'ios' ? 'spinner' : 'default'
                                        }
                                        onChange={(e, d) => {
                                            if (Platform.OS === 'android')
                                                setShowTimePicker(false);
                                            if (e?.type === 'dismissed') return;
                                            if (d) onSameDayTimeChange(d);
                                        }}
                                        themeVariant="dark"
                                    />
                                    {Platform.OS === 'ios' ? (
                                        <Pressable
                                            style={styles.doneLink}
                                            onPress={() => setShowTimePicker(false)}
                                        >
                                            <Text style={styles.link}>Concluir</Text>
                                        </Pressable>
                                    ) : null}
                                </>
                            ) : null}
                            {!hasExpiresAt ? (
                                <Text style={styles.warn}>
                                    Defina a data de vencimento para usar &quot;Lembrar no
                                    dia&quot;.
                                </Text>
                            ) : null}
                        </>
                    ) : null}

                    <Pressable
                        style={[
                            styles.checkRow,
                            customDisabled && styles.checkRowDisabled,
                            styles.checkRowSpaced,
                        ]}
                        onPress={() => !customDisabled && toggleCustom()}
                        disabled={customDisabled}
                    >
                        <Ionicons
                            name={customMode ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={
                                customDisabled
                                    ? colors.textDim
                                    : customMode
                                      ? colors.accent
                                      : colors.textMuted
                            }
                        />
                        <Text style={[styles.checkLabel, customDisabled && styles.muted]}>
                            Escolher data da notificação
                        </Text>
                    </Pressable>
                    {customMode ? (
                        <>
                            <Pressable
                                style={styles.timeButton}
                                onPress={() => setShowCustomPicker(true)}
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={20}
                                    color={colors.accent}
                                />
                                <Text style={styles.timeButtonText}>
                                    {customAt
                                        ? customAt.toLocaleString('pt-BR', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : 'Data e horário'}
                                </Text>
                            </Pressable>
                            {showCustomPicker ? (
                                <>
                                    <DateTimePicker
                                        value={customAt ?? new Date()}
                                        mode="datetime"
                                        display={
                                            Platform.OS === 'ios' ? 'spinner' : 'default'
                                        }
                                        onChange={(e, d) => {
                                            if (Platform.OS === 'android')
                                                setShowCustomPicker(false);
                                            if (e?.type === 'dismissed') return;
                                            if (d) onCustomAtChange(d);
                                        }}
                                        themeVariant="dark"
                                    />
                                    {Platform.OS === 'ios' ? (
                                        <Pressable
                                            style={styles.doneLink}
                                            onPress={() => setShowCustomPicker(false)}
                                        >
                                            <Text style={styles.link}>Concluir</Text>
                                        </Pressable>
                                    ) : null}
                                </>
                            ) : null}
                        </>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: space.lg,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space.sm,
    },
    switchLabelWrap: {
        flex: 1,
        marginRight: space.md,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    hint: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    options: {
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space.md,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkRowSpaced: {
        marginTop: space.md,
    },
    checkRowDisabled: {
        opacity: 0.45,
    },
    checkLabel: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
    },
    muted: {
        color: colors.textDim,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: space.sm,
        marginLeft: 32,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: colors.surfaceModal,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    timeButtonText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    warn: {
        marginTop: space.sm,
        marginLeft: 32,
        fontSize: 13,
        color: colors.danger,
        lineHeight: 18,
    },
    doneLink: {
        alignItems: 'center',
        marginTop: space.xs,
    },
    link: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
});
