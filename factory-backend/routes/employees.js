import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router({ mergeParams: true });
// 所有路由前缀：/api/companies/:company/employees

// ── 获取员工列表 ──────────────────────────────────────────────
router.get('/', (req, res) => {
  const { company } = req.params;
  const db = getDb();
  const rows = db.prepare(`SELECT id, name FROM employees WHERE company_code=? ORDER BY id`).all(company);
  res.json(rows);
});

// ── 添加员工 ──────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { company } = req.params;
  let { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: '请填写工号和姓名' });

  const db = getDb();
  // 获取公司前缀并自动补全
  const comp = db.prepare(`SELECT prefix FROM companies WHERE code=?`).get(company);
  if (!comp) return res.status(404).json({ error: '公司不存在' });

  const prefix = comp.prefix.toUpperCase();
  id = id.toUpperCase();
  if (!id.startsWith(prefix)) id = prefix + id;

  const exists = db.prepare(`SELECT id FROM employees WHERE id=? AND company_code=?`).get(id, company);
  if (exists) return res.status(409).json({ error: '工号已存在' });

  db.prepare(`INSERT INTO employees(id, company_code, name) VALUES (?, ?, ?)`).run(id, company, name);
  res.json({ id, name });
});

// ── 删除员工 ──────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const { company, id } = req.params;
  const db = getDb();
  db.prepare(`DELETE FROM employees WHERE id=? AND company_code=?`).run(id, company);
  res.json({ ok: true });
});

export default router;
