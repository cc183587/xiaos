import { getDb } from './factory-backend/config/database.js';

const db = getDb();
const settings = db.prepare('SELECT * FROM settings').all();
console.log('Settings 表数据:');
console.log(JSON.stringify(settings, null, 2));
