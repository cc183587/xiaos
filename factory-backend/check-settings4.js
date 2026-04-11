import { getDb } from './config/database.js';

try {
    const db = getDb();
    console.log('数据库连接成功');
    
    // 检查settings表是否存在
    const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`).get();
    console.log('表检查:', tableCheck);
    
    // 查询所有数据
    const settings = db.prepare('SELECT * FROM settings').all();
    console.log('Settings 表数据:', settings);
    console.log('记录数:', settings.length);
    
    if (settings.length === 0) {
        console.log('settings 表为空');
    } else {
        settings.forEach(row => {
            console.log(`公司: ${row.company_code}, key: ${row.serverchan_key}`);
        });
    }
} catch (error) {
    console.error('错误:', error.message);
}