import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router({ mergeParams: true });
// 路由前缀：/api/companies/:company/products

// ── 获取产品列表（含工序）──────────────────────────────────────
router.get('/', (req, res) => {
  const { company } = req.params;
  const db = getDb();
  const prods = db.prepare(`SELECT prod_key, name, hidden, image FROM products WHERE company_code=? ORDER BY prod_key`).all(company);
  const result = {};
  for (const p of prods) {
    const procs = db.prepare(
      `SELECT id, name, price, remark FROM processes WHERE prod_key=? AND company_code=? ORDER BY sort_order`
    ).all(p.prod_key, company);
    result[p.prod_key] = {
      name: p.name,
      hidden: p.hidden === 1,
      image: p.image || null,
      processes: procs.map(pr => {
        const obj = { id: pr.id, n: pr.name, p: pr.price };
        if (pr.remark) obj.r = pr.remark;
        return obj;
      })
    };
  }
  res.json(result);
});

// ── 添加产品 ──────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { company } = req.params;
  const { key, name } = req.body;
  if (!key || !name) return res.status(400).json({ error: '请填写产品key和名称' });

  const db = getDb();
  const exists = db.prepare(`SELECT prod_key FROM products WHERE prod_key=? AND company_code=?`).get(key, company);
  if (exists) return res.status(409).json({ error: '产品已存在' });

  db.prepare(`INSERT INTO products(prod_key, company_code, name) VALUES (?, ?, ?)`).run(key, company, name);
  res.json({ prod_key: key, name, processes: [] });
});

// ── 更新产品名称 ──────────────────────────────────────────────
router.put('/:key', (req, res) => {
  const { company, key } = req.params;
  const { name } = req.body;
  const db = getDb();
  db.prepare(`UPDATE products SET name=? WHERE prod_key=? AND company_code=?`).run(name, key, company);
  res.json({ ok: true });
});

// ── 切换产品隐藏状态 ──────────────────────────────────────────
router.post('/:key/toggle-hidden', (req, res) => {
  const { company, key } = req.params;
  const db = getDb();
  const prod = db.prepare(`SELECT hidden FROM products WHERE prod_key=? AND company_code=?`).get(key, company);
  if (!prod) return res.status(404).json({ error: '产品不存在' });
  const newHidden = prod.hidden === 1 ? 0 : 1;
  db.prepare(`UPDATE products SET hidden=? WHERE prod_key=? AND company_code=?`).run(newHidden, key, company);
  res.json({ ok: true, hidden: newHidden === 1 });
});

// ── 上传/更新产品图片 ─────────────────────────────────────────
router.put('/:key/image', (req, res) => {
  const { company, key } = req.params;
  const { image } = req.body; // base64 data URL 或 null（删除图片）
  const db = getDb();
  const prod = db.prepare(`SELECT prod_key FROM products WHERE prod_key=? AND company_code=?`).get(key, company);
  if (!prod) return res.status(404).json({ error: '产品不存在' });

  // 校验大小（base64 约 1.37倍，限制原图 500KB 约等于 base64 700KB）
  if (image && image.length > 800 * 1024) {
    return res.status(400).json({ error: '图片太大，请压缩后上传（建议500KB以内）' });
  }

  db.prepare(`UPDATE products SET image=? WHERE prod_key=? AND company_code=?`).run(image || null, key, company);
  res.json({ ok: true });
});

// ── 删除产品 ──────────────────────────────────────────────────
router.delete('/:key', (req, res) => {
  const { company, key } = req.params;
  const db = getDb();
  db.prepare(`DELETE FROM processes WHERE prod_key=? AND company_code=?`).run(key, company);
  db.prepare(`DELETE FROM products WHERE prod_key=? AND company_code=?`).run(key, company);
  res.json({ ok: true });
});

// ── 添加工序 ──────────────────────────────────────────────────
router.post('/:key/processes', (req, res) => {
  const { company, key } = req.params;
  const { name, price, remark } = req.body;
  if (!name || price == null) return res.status(400).json({ error: '请填写工序名称和单价' });

  const db = getDb();
  const maxOrder = db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) as m FROM processes WHERE prod_key=? AND company_code=?`
  ).get(key, company).m;

  const result = db.prepare(
    `INSERT INTO processes(prod_key, company_code, name, price, sort_order, remark) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(key, company, name, price, maxOrder + 1, remark || null);

  res.json({ id: result.lastInsertRowid, name, price, remark: remark || null });
});

// ── 更新工序 ──────────────────────────────────────────────────
router.put('/:key/processes/:procId', (req, res) => {
  const { procId } = req.params;
  const { name, price, remark } = req.body;
  const db = getDb();
  db.prepare(`UPDATE processes SET name=?, price=?, remark=? WHERE id=?`).run(name, price, remark || null, procId);
  res.json({ ok: true });
});

// ── 删除工序 ──────────────────────────────────────────────────
router.delete('/:key/processes/:procId', (req, res) => {
  const { procId } = req.params;
  const db = getDb();
  db.prepare(`DELETE FROM processes WHERE id=?`).run(procId);
  res.json({ ok: true });
});

export default router;
