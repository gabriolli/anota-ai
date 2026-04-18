/** Utilitários de data compartilhados entre lista e filtros. */

export function startOfDay(d: Date): number {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
}

export function dueStatus(expires: Date | undefined): 'none' | 'soon' | 'overdue' | 'ok' {
    if (!expires) return 'none';
    const t0 = startOfDay(new Date());
    const t1 = startOfDay(expires);
    if (t1 < t0) return 'overdue';
    const days = Math.ceil((t1 - t0) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'soon';
    return 'ok';
}

/** Dias até o vencimento (início do dia); negativo se atrasado; null se sem data. */
export function daysUntilDue(expires: Date | undefined): number | null {
    if (!expires) return null;
    const t0 = startOfDay(new Date());
    const t1 = startOfDay(expires);
    return Math.ceil((t1 - t0) / (1000 * 60 * 60 * 24));
}
