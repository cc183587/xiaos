const Database = require('better-sqlite3');
const db = new Database('./factory-backend/database/factory.db');
const rows = db.prepare('SELECT * FROM settings').all();
console.log('Settings 表数据:');
console.log(rows);
if (rows.length === 0) {
    console.log('settings 表为空');
} else {
    rows.forEach(row => {
        console.log(`公司: ${row.company_code}, key: ${row.serverchan_key}`);
    });
}