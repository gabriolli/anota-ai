import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ItemNoteRepository from '../database/ItemNoteRepository';
import { colors } from '../theme/upTodoTheme';

type Props = {
    children: React.ReactNode;
};

export function SQLiteProvider({ children }: Props) {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await ItemNoteRepository.ensureSchema();
                if (!cancelled) setReady(true);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e : new Error(String(e)));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorTitle}>Não foi possível abrir o banco local.</Text>
                <Text style={styles.errorDetail}>{error.message}</Text>
            </View>
        );
    }

    if (!ready) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: colors.bg,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        color: colors.text,
    },
    errorDetail: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
