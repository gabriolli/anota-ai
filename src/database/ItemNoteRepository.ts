import type { SQLiteDatabase } from 'expo-sqlite';
import db from './SQLiteDB';

export type ItemNote = {
    id?: number;
    created_at?: Date;
    updated_at?: Date;
    item_name?: string;
    item_description?: string;
    item_img_uri?: string;
    expires_at?: Date;
    notify_enabled?: boolean;
    notify_same_day?: boolean;
    notify_same_day_time?: string;
    notify_custom_at?: Date;
};

type ItemNoteRow = {
    id: number;
    created_at: string;
    updated_at: string;
    item_name: string | null;
    item_description: string | null;
    item_img_uri: string | null;
    expires_at: string | null;
    notify_enabled: number | null;
    notify_same_day: number | null;
    notify_same_day_time: string | null;
    notify_custom_at: string | null;
};

async function addColumnIfMissing(database: SQLiteDatabase, column: string, ddl: string) {
    const rows = await database.getAllAsync<{ name: string }>(
        'PRAGMA table_info(item_note)',
    );
    const names = new Set(rows.map(r => r.name));
    if (!names.has(column)) {
        await database.execAsync(`ALTER TABLE item_note ADD COLUMN ${ddl}`);
    }
}

class ItemNoteRepository {
    public async ensureSchema() {
        const database = await db;
        await database.runAsync(
            'CREATE TABLE IF NOT EXISTS item_note (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, item_name TEXT, item_description TEXT, item_img_uri TEXT, expires_at TEXT)',
        );
        await addColumnIfMissing(
            database,
            'notify_enabled',
            'notify_enabled INTEGER DEFAULT 0',
        );
        await addColumnIfMissing(
            database,
            'notify_same_day',
            'notify_same_day INTEGER DEFAULT 0',
        );
        await addColumnIfMissing(
            database,
            'notify_same_day_time',
            "notify_same_day_time TEXT DEFAULT '09:00'",
        );
        await addColumnIfMissing(database, 'notify_custom_at', 'notify_custom_at TEXT');
    }

    public async down() {
        const database = await db;
        await database.runAsync('DROP TABLE item_note');
    }

    public async createItemNote(itemNote: ItemNote) {
        const database = await db;
        const now = new Date().toISOString();
        const ne = itemNote.notify_enabled ? 1 : 0;
        const nsd = itemNote.notify_same_day ? 1 : 0;
        const nst = itemNote.notify_same_day_time ?? '09:00';
        const nca = itemNote.notify_custom_at?.toISOString() ?? null;

        const result = await database.runAsync(
            `INSERT INTO item_note (
                created_at, updated_at, item_name, item_description, item_img_uri, expires_at,
                notify_enabled, notify_same_day, notify_same_day_time, notify_custom_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                itemNote.created_at?.toISOString() ?? now,
                itemNote.updated_at?.toISOString() ?? now,
                itemNote.item_name ?? null,
                itemNote.item_description ?? null,
                itemNote.item_img_uri?.toString() ?? null,
                itemNote.expires_at?.toISOString() ?? null,
                ne,
                nsd,
                nst,
                nca,
            ],
        );

        return result.lastInsertRowId ?? null;
    }

    public async getAllItemNote(limit = 500, offset = 0) {
        const database = await db;
        const result = await database.getAllAsync<ItemNoteRow>(
            `SELECT * FROM item_note
             ORDER BY (expires_at IS NULL), datetime(expires_at) ASC, datetime(created_at) DESC
             LIMIT ? OFFSET ?`,
            [limit, offset],
        );

        return result.map(row => this.formatNoteFromDB(row));
    }

    public async getByName(itemName: string) {
        const database = await db;
        const result = await database.getAllAsync<ItemNoteRow>(
            'SELECT * FROM item_note WHERE item_name = ?',
            [itemName],
        );

        return result.map(row => this.formatNoteFromDB(row));
    }

    public async getById(id: number): Promise<ItemNote | null> {
        const database = await db;
        const row = await database.getFirstAsync<ItemNoteRow>(
            'SELECT * FROM item_note WHERE id = ?',
            [id],
        );
        return row ? this.formatNoteFromDB(row) : null;
    }

    public async updateItemNote(itemNote: ItemNote) {
        if (!itemNote.id) {
            throw new Error('ID do item necessário.');
        }

        const updatedAt = new Date().toISOString();
        const database = await db;
        const ne = itemNote.notify_enabled ? 1 : 0;
        const nsd = itemNote.notify_same_day ? 1 : 0;
        const nst = itemNote.notify_same_day_time ?? '09:00';
        const nca = itemNote.notify_custom_at?.toISOString() ?? null;

        const result = await database.runAsync(
            `UPDATE item_note SET
                updated_at = ?, item_name = ?, item_description = ?, item_img_uri = ?, expires_at = ?,
                notify_enabled = ?, notify_same_day = ?, notify_same_day_time = ?, notify_custom_at = ?
            WHERE id = ?`,
            [
                updatedAt,
                itemNote.item_name ?? null,
                itemNote.item_description ?? null,
                itemNote.item_img_uri?.toString() ?? null,
                itemNote.expires_at?.toISOString() ?? null,
                ne,
                nsd,
                nst,
                nca,
                itemNote.id,
            ],
        );

        return result.changes;
    }

    public async deleteItem(id: number) {
        const database = await db;
        const result = await database.runAsync('DELETE FROM item_note WHERE id = ?', [
            id,
        ]);

        return result.changes ?? null;
    }

    private formatNoteFromDB(row: ItemNoteRow): ItemNote {
        return {
            id: row.id,
            item_name: row.item_name ?? undefined,
            item_description: row.item_description ?? undefined,
            item_img_uri: row.item_img_uri ?? undefined,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
            notify_enabled: (row.notify_enabled ?? 0) === 1,
            notify_same_day: (row.notify_same_day ?? 0) === 1,
            notify_same_day_time: row.notify_same_day_time ?? '09:00',
            notify_custom_at: row.notify_custom_at
                ? new Date(row.notify_custom_at)
                : undefined,
        };
    }
}

export default new ItemNoteRepository();
