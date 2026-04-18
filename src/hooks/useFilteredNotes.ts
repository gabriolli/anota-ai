import { useMemo, useState, useEffect } from 'react';
import type { ItemNote } from '../database/ItemNoteRepository';
import { daysUntilDue, startOfDay } from '../lib/noteDates';

export type NoteListFilter =
    | 'all'
    | 'with_due'
    | 'no_due'
    | 'overdue'
    | 'due_soon'
    | 'notify_on';

export type NoteListSort =
    | 'due_asc'
    | 'created_desc'
    | 'created_asc'
    | 'name_asc'
    | 'name_desc';

function normalizeSearch(q: string): string {
    return q.trim().toLowerCase();
}

function matchesSearch(note: ItemNote, q: string): boolean {
    if (!q) return true;
    const name = (note.item_name ?? '').toLowerCase();
    const desc = (note.item_description ?? '').toLowerCase();
    return name.includes(q) || desc.includes(q);
}

function matchesFilter(note: ItemNote, filter: NoteListFilter): boolean {
    const d = daysUntilDue(note.expires_at);
    switch (filter) {
        case 'all':
            return true;
        case 'with_due':
            return note.expires_at != null;
        case 'no_due':
            return note.expires_at == null;
        case 'overdue':
            return d != null && d < 0;
        case 'due_soon':
            return d != null && d >= 0 && d <= 7;
        case 'notify_on':
            return note.notify_enabled === true;
        default:
            return true;
    }
}

function sortNotes(list: ItemNote[], sort: NoteListSort): ItemNote[] {
    const out = [...list];

    switch (sort) {
        case 'due_asc':
            return out.sort((a, b) => {
                const ae = a.expires_at
                    ? startOfDay(a.expires_at)
                    : Number.POSITIVE_INFINITY;
                const be = b.expires_at
                    ? startOfDay(b.expires_at)
                    : Number.POSITIVE_INFINITY;
                if (ae === be) {
                    const ca = a.created_at?.getTime() ?? 0;
                    const cb = b.created_at?.getTime() ?? 0;
                    return cb - ca;
                }
                if (ae === Number.POSITIVE_INFINITY) return 1;
                if (be === Number.POSITIVE_INFINITY) return -1;
                return ae - be;
            });
        case 'created_desc':
            return out.sort(
                (a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
            );
        case 'created_asc':
            return out.sort(
                (a, b) => (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0),
            );
        case 'name_asc':
            return out.sort((a, b) =>
                (a.item_name ?? '').localeCompare(b.item_name ?? '', 'pt-BR', {
                    sensitivity: 'base',
                }),
            );
        case 'name_desc':
            return out.sort((a, b) =>
                (b.item_name ?? '').localeCompare(a.item_name ?? '', 'pt-BR', {
                    sensitivity: 'base',
                }),
            );
        default:
            return out;
    }
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export function useFilteredNotes(
    notes: ItemNote[],
    searchRaw: string,
    filter: NoteListFilter,
    sort: NoteListSort,
) {
    const debouncedSearch = useDebouncedValue(searchRaw, 280);

    return useMemo(() => {
        const q = normalizeSearch(debouncedSearch);
        const filtered = notes.filter(
            n => matchesSearch(n, q) && matchesFilter(n, filter),
        );
        return sortNotes(filtered, sort);
    }, [notes, debouncedSearch, filter, sort]);
}
