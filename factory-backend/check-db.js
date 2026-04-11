import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'database', 'factory.db');

console.log('打开数据库:', DB_PATH);
const db = new DatabaseSync(DB_PATH);

// 检查表
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
console.log('所有表:', tables);

// 查询settings表
try {
    const settings = db.prepare('SELECT * FROM settings').all();
    console.log('Settings 内容:', settings);
} catch (err) {
    console.error('查询settings表失败:', err.message);
}

// 查询特定公司
const row = db.prepare(`SELECT * FROM settings WHERE company_code = ?`).get('default');
console.log('default 公司设置:', row);