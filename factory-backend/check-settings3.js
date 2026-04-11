import { getDb } from './config/database.js';

const db = getDb();
const settings = db.prepare('SELECT * FROM settings').all();
console.log('Settings 表数据:');
console.log(JSON.stringify(settings, null, 2));
if (settings.length === 0) {
    console.log('settings 表为空');
} else {
    settings.forEach(row => {
        console.log(`公司: ${row.company_code}, key: ${row.serverchan_key}`);
    });
}