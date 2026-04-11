import { getDb } from './config/database.js';

const db = getDb();

// 检查表
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`).all();
console.error('Tables:', tables);

// 查询所有设置
const settings = db.prepare('SELECT * FROM settings').all();
console.error('All settings:', JSON.stringify(settings, null, 2));

// 查询公司A
const rowA = db.prepare(`SELECT * FROM settings WHERE company_code = ?`).get('A');
console.error('Company A settings:', rowA);

// 查询公司B
const rowB = db.prepare(`SELECT * FROM settings WHERE company_code = ?`).get('B');
console.error('Company B settings:', rowB);

// 如果没有数据，插入示例
if (!rowA && !rowB) {
    console.error('No settings found. Inserting dummy key.');
    db.prepare(`INSERT OR REPLACE INTO settings (company_code, serverchan_key, updated_at) VALUES (?, ?, ?)`)
        .run('A', 'DUMMY_KEY', new Date().toISOString());
    console.error('Inserted dummy key for company A.');
}