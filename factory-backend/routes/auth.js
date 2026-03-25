import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

// ── 获取公司信息（不含密码）──────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT code, name, prefix FROM companies`).all();
  res.json(rows);
});

// ── 验证登录 ─────────────────────────────────────────────────
// POST /api/auth/login  { input: "a001" 或 "XS" }
router.post('/login', (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: '请输入工号' });

  const db = getDb();
  const inputLower = input.toLowerCase().trim();

  // 1. 管理员密码匹配（不区分大小写）
  const companies = db.prepare(`SELECT * FROM companies`).all();
  for (const c of companies) {
    if (inputLower === c.admin_pwd.toLowerCase()) {
      return res.json({ role: 'admin', companyCode: c.code, companyName: c.name });
    }
  }

  // 2. 工号前缀识别公司
  const prefix = inputLower.charAt(0);
  const company = companies.find(c => c.prefix === prefix);
  if (!company) {
    return res.status(401).json({ error: '工号格式不正确，请以公司前缀开头' });
  }

  // 3. 查找员工（不区分大小写）
  const emp = db.prepare(
    `SELECT * FROM employees WHERE company_code=? AND LOWER(id)=?`
  ).get(company.code, inputLower);

  if (!emp) {
    return res.status(401).json({ error: '工号不存在' });
  }

  return res.json({
    role: 'employee',
    companyCode: company.code,
    companyName: company.name,
    empId: emp.id,
    empName: emp.name
  });
});

export default router;
