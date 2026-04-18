import { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ItemNoteRepository, { ItemNote } from '../database/ItemNoteRepository';
import {
    type NoteListFilter,
    type NoteListSort,
    useFilteredNotes,
} from '../hooks/useFilteredNotes';
import { dueStatus } from '../lib/noteDates';
import { colors, radii, space } from '../theme/upTodoTheme';

const FILTER_OPTIONS: { key: NoteListFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'with_due', label: 'Com vencimento' },
    { key: 'no_due', label: 'Sem data' },
    { key: 'overdue', label: 'Atrasados' },
    { key: 'due_soon', label: '7 dias' },
    { key: 'notify_on', label: 'Com lembrete' },
];

const SORT_OPTIONS: { key: NoteListSort; label: string }[] = [
    { key: 'due_asc', label: 'Vencimento' },
    { key: 'created_desc', label: 'Inclusão · recentes' },
    { key: 'created_asc', label: 'Inclusão · antigos' },
    { key: 'name_asc', label: 'Nome A–Z' },
    { key: 'name_desc', label: 'Nome Z–A' },
];

function formatReturnDate(d: Date | undefined): string {
    if (!d) return 'Sem data';
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notes, setNotes] = useState<ItemNote[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<NoteListFilter>('all');
    const [sort, setSort] = useState<NoteListSort>('due_asc');
    const [sortModalOpen, setSortModalOpen] = useState(false);

    const displayedNotes = useFilteredNotes(notes, search, filter, sort);

    const loadNotes = useCallback(async () => {
        const list = await ItemNoteRepository.getAllItemNote();
        setNotes(list);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadNotes();
        }, [loadNotes]),
    );

    const sortLabel = useMemo(
        () => SORT_OPTIONS.find(o => o.key === sort)?.label ?? 'Ordenar',
        [sort],
    );

    const listHeader = useMemo(
        () => (
            <View style={styles.headerStack}>
                <View
                    style={[
                        styles.logoHeader,
                        { paddingTop: Math.max(insets.top, space.md) + space.sm },
                    ]}
                >
                    <Image
                        source={require('../../assets/logo-header.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                        accessibilityLabel="Anota Aí!"
                    />
                </View>

                <View style={styles.searchRow}>
                    <Ionicons
                        name="search"
                        size={20}
                        color={colors.textDim}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar nome ou descrição"
                        placeholderTextColor={colors.textDim}
                    />
                    {search.length > 0 ? (
                        <Pressable onPress={() => setSearch('')} hitSlop={8}>
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color={colors.textMuted}
                            />
                        </Pressable>
                    ) : null}
                </View>

                <Pressable style={styles.sortRow} onPress={() => setSortModalOpen(true)}>
                    <Ionicons name="swap-vertical" size={18} color={colors.accent} />
                    <Text style={styles.sortRowText}>{sortLabel}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                >
                    {FILTER_OPTIONS.map(opt => {
                        const selected = filter === opt.key;
                        return (
                            <Pressable
                                key={opt.key}
                                style={[styles.chip, selected && styles.chipSelected]}
                                onPress={() => setFilter(opt.key)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        selected && styles.chipTextSelected,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
        ),
        [insets.top, search, filter, sortLabel],
    );

    const emptyIsFiltered = notes.length > 0 && displayedNotes.length === 0;

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <FlatList
                data={displayedNotes}
                keyExtractor={item => String(item.id)}
                ListHeaderComponent={listHeader}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 88 },
                ]}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons
                                name={
                                    emptyIsFiltered
                                        ? 'filter-outline'
                                        : 'document-text-outline'
                                }
                                size={40}
                                color={colors.accent}
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {emptyIsFiltered ? 'Nada encontrado' : 'Comece pelo +'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {emptyIsFiltered
                                ? 'Tente outro termo de busca ou outro filtro.'
                                : 'Ex.: livro da biblioteca com foto e data de devolução!'}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const status = dueStatus(item.expires_at);
                    const metaColor =
                        status === 'overdue'
                            ? colors.danger
                            : status === 'soon'
                              ? colors.accent
                              : colors.textMuted;

                    return (
                        <Pressable
                            style={({ pressed }) => [
                                styles.card,
                                pressed && styles.cardPressed,
                            ]}
                            onPress={() => {
                                if (item.id == null) return;
                                router.push(`/note/${item.id}` as Href);
                            }}
                        >
                            {item.item_img_uri ? (
                                <Image
                                    source={{ uri: item.item_img_uri }}
                                    style={styles.thumb}
                                />
                            ) : (
                                <View style={styles.thumbPlaceholder}>
                                    <Ionicons
                                        name="image-outline"
                                        size={26}
                                        color={colors.textDim}
                                    />
                                </View>
                            )}
                            <View style={styles.cardBody}>
                                <Text style={styles.cardTitle} numberOfLines={2}>
                                    {item.item_name || 'Sem título'}
                                </Text>
                                <View style={styles.metaRow}>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={14}
                                        color={metaColor}
                                        style={styles.metaIcon}
                                    />
                                    <Text style={[styles.cardMeta, { color: metaColor }]}>
                                        {formatReturnDate(item.expires_at)}
                                        {status === 'overdue' ? ' · atrasado' : ''}
                                        {status === 'soon' ? ' · em breve' : ''}
                                    </Text>
                                </View>
                                {item.notify_enabled ? (
                                    <View style={styles.bellRow}>
                                        <Ionicons
                                            name="notifications"
                                            size={12}
                                            color={colors.accent}
                                        />
                                        <Text style={styles.bellHint}>
                                            Lembrete ativo
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={colors.textDim}
                            />
                        </Pressable>
                    );
                }}
            />
            <Pressable
                style={[styles.fab, { bottom: Math.max(insets.bottom, 20) + 8 }]}
                onPress={() => router.push('/note/new' as Href)}
            >
                <Ionicons name="add" size={30} color={colors.text} />
            </Pressable>

            <Modal
                visible={sortModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setSortModalOpen(false)}
            >
                <View style={styles.modalWrap}>
                    <Pressable
                        style={[StyleSheet.absoluteFillObject, styles.modalDim]}
                        onPress={() => setSortModalOpen(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Ordenar lista</Text>
                        {SORT_OPTIONS.map(opt => (
                            <Pressable
                                key={opt.key}
                                style={[
                                    styles.modalOption,
                                    sort === opt.key && styles.modalOptionSelected,
                                ]}
                                onPress={() => {
                                    setSort(opt.key);
                                    setSortModalOpen(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.modalOptionText,
                                        sort === opt.key &&
                                            styles.modalOptionTextSelected,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                                {sort === opt.key ? (
                                    <Ionicons
                                        name="checkmark"
                                        size={20}
                                        color={colors.accent}
                                    />
                                ) : null}
                            </Pressable>
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    listContent: {
        paddingHorizontal: space.md,
        flexGrow: 1,
    },
    headerStack: {
        marginBottom: space.sm,
    },
    logoHeader: {
        alignItems: 'center',
        marginBottom: space.md,
        paddingHorizontal: space.md,
    },
    logoImage: {
        height: 72,
        width: '100%',
        maxWidth: 320,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        marginBottom: space.sm,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
    },
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: space.sm,
        paddingVertical: 4,
    },
    sortRowText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
    },
    chipsScroll: {
        gap: 8,
        paddingBottom: space.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radii.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
    },
    chipSelected: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accent,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    chipTextSelected: {
        color: colors.accent,
    },
    modalWrap: {
        flex: 1,
        justifyContent: 'center',
        padding: space.lg,
    },
    modalDim: {
        backgroundColor: colors.overlay,
    },
    modalCard: {
        zIndex: 1,
        backgroundColor: colors.surfaceModal,
        borderRadius: radii.lg,
        padding: space.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: space.md,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: radii.sm,
    },
    modalOptionSelected: {
        backgroundColor: colors.accentSoft,
    },
    modalOptionText: {
        fontSize: 15,
        color: colors.text,
    },
    modalOptionTextSelected: {
        fontWeight: '600',
        color: colors.accent,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingHorizontal: space.xl,
        paddingTop: 24,
    },
    emptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: space.md,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: space.sm,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: 15,
        lineHeight: 22,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: space.sm + 2,
        marginBottom: space.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    cardPressed: {
        backgroundColor: colors.surfaceModal,
    },
    thumb: {
        width: 64,
        height: 64,
        borderRadius: radii.sm,
        backgroundColor: colors.border,
    },
    thumbPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: radii.sm,
        backgroundColor: colors.bgElevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardBody: {
        flex: 1,
        marginLeft: space.md,
        marginRight: space.xs,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    metaIcon: {
        marginRight: 4,
    },
    cardMeta: {
        fontSize: 13,
        flex: 1,
    },
    bellRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    bellHint: {
        fontSize: 11,
        color: colors.accent,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        right: space.md,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
    },
});
