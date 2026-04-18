import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseAsync('anotaAiStorage');

export default db;
