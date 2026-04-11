import { getDb } from './config/database.js';

const db = getDb();
const records = db.prepare('SELECT company_code, emp_id, date, prod_key FROM records ORDER BY id DESC LIMIT 5').all();
console.error('Recent records:', records);