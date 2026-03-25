import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router({ mergeParams: true });
// 路由前缀：/api/companies/:company/records

// ── 查询产量记录 ──────────────────────────────────────────────
// GET ?empId=A001&date=2026-03-25
router.get('/', (req, res) => {
  const { company } = req.params;
  const { empId, date } = req.query;
  const db = getDb();

  let sql = `SELECT * FROM records WHERE company_code=?`;
  const params = [company];

  if (empId) { sql += ` AND emp_id=?`; params.push(empId); }
  if (date)  { sql += ` AND date=?`;   params.push(date); }

  sql += ` ORDER BY date DESC, reg_id DESC, id ASC`;

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    id: r.id,
    empId: r.emp_id,
    date: r.date,
    prodKey: r.prod_key,
    name: r.process_name,
    n: r.qty,
    p: r.price,
    time: r.time,
    regId: r.reg_id,
    batchCode: r.batch_code
  })));
});

// ── 添加产量记录（批量，一次登记多个工序）──────────────────────
// POST { empId, prodKey, date, processes: [{name, qty, price}], batchCode, regId? }
router.post('/', (req, res) => {
  const { company } = req.params;
  const { empId, prodKey, date, processes, batchCode, regId } = req.body;
  if (!empId || !prodKey || !date || !processes || processes.length === 0) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const db = getDb();

  // 自动递增 regSeq
  let finalRegId = regId;
  if (!finalRegId) {
    const seqRow = db.prepare(
      `INSERT INTO reg_seq(company_code, seq) VALUES (?, 1)
       ON CONFLICT(company_code) DO UPDATE SET seq = seq + 1
       RETURNING seq`
    ).get(company);
    finalRegId = seqRow.seq;
  }

  const insert = db.prepare(`
    INSERT INTO records(company_code, emp_id, date, prod_key, process_name, qty, price, time, reg_id, batch_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toTimeString().split(' ')[0];
  const insertMany = db.transaction((procs) => {
    for (const p of procs) {
      insert.run(company, empId, date, prodKey, p.name, p.qty, p.price, now, finalRegId, batchCode || null);
    }
  });
  insertMany(processes);

  // 更新批次薪资
  if (batchCode) {
    const totalWage = processes.reduce((s, p) => s + p.qty * p.price, 0);
    const batch = db.prepare(`SELECT id FROM batches WHERE batch_code=? AND company_code=?`).get(batchCode, company);
    if (batch) {
      db.prepare(`UPDATE batches SET wage_total = wage_total + ? WHERE id=?`).run(totalWage, batch.id);
    }
  }

  res.json({ ok: true, regId: finalRegId, time: now });
});

// ── 删除产量记录 ──────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const { company, id } = req.params;
  const db = getDb();
  // 先找到这条记录，撤销批次薪资
  const rec = db.prepare(`SELECT * FROM records WHERE id=? AND company_code=?`).get(id, company);
  if (rec && rec.batch_code) {
    const wage = rec.qty * rec.price;
    const batch = db.prepare(`SELECT id FROM batches WHERE batch_code=? AND company_code=?`).get(rec.batch_code, company);
    if (batch) {
      db.prepare(`UPDATE batches SET wage_total = MAX(0, wage_total - ?) WHERE id=?`).run(wage, batch.id);
    }
  }
  db.prepare(`DELETE FROM records WHERE id=? AND company_code=?`).run(id, company);
  res.json({ ok: true });
});

// ── 修改产量记录数量 ──────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { company, id } = req.params;
  const { qty } = req.body;
  if (qty == null) return res.status(400).json({ error: 'qty 必填' });

  const db = getDb();
  const rec = db.prepare(`SELECT * FROM records WHERE id=? AND company_code=?`).get(id, company);
  if (!rec) return res.status(404).json({ error: '记录不存在' });

  // 更新批次薪资差额
  if (rec.batch_code) {
    const diff = (qty - rec.qty) * rec.price;
    const batch = db.prepare(`SELECT id FROM batches WHERE batch_code=? AND company_code=?`).get(rec.batch_code, company);
    if (batch) {
      db.prepare(`UPDATE batches SET wage_total = MAX(0, wage_total + ?) WHERE id=?`).run(diff, batch.id);
    }
  }

  db.prepare(`UPDATE records SET qty=? WHERE id=?`).run(qty, id);
  res.json({ ok: true });
});

export default router;
