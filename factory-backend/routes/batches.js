import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router({ mergeParams: true });
// 路由前缀：/api/companies/:company/batches

// ── 批次列表 ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { company } = req.params;
  const db = getDb();

  const batches = db.prepare(
    `SELECT * FROM batches WHERE company_code=? ORDER BY create_time DESC`
  ).all(company);

  const result = batches.map(b => {
    const deliveries = db.prepare(
      `SELECT * FROM batch_deliveries WHERE batch_id=? ORDER BY id`
    ).all(b.id);
    return {
      id: b.id,
      batchCode: b.batch_code,
      prodKey: b.prod_key,
      prodName: b.prod_name,
      color: b.color,
      qty: b.qty,
      price: b.price,
      totalCost: b.total_cost,
      status: b.status,
      createTime: b.create_time,
      wageTotal: b.wage_total,
      outQty: b.out_qty,
      outCost: b.out_cost,
      profit: b.profit,
      outDate: b.out_date,
      closedTime: b.closed_time,
      lossQty: b.loss_qty,
      lossReason: b.loss_reason,
      deliveries: deliveries.map(d => ({
        id: d.id,
        date: d.date,
        qty: d.qty,
        cost: d.cost,
        wageShare: d.wage_share,
        profit: d.profit
      }))
    };
  });

  res.json(result);
});

// ── 创建批次（入库）──────────────────────────────────────────
router.post('/', (req, res) => {
  const { company } = req.params;
  const { prodKey, color, qty, price } = req.body;
  if (!prodKey || !qty || !price) return res.status(400).json({ error: '请填写完整' });

  const db = getDb();

  // 生成批次编号
  const now = new Date();
  const ymd = now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0');

  const seqRow = db.prepare(
    `INSERT INTO batch_seq(company_code, ymd, seq) VALUES (?, ?, 1)
     ON CONFLICT(company_code, ymd) DO UPDATE SET seq = seq + 1
     RETURNING seq`
  ).get(company, ymd);
  const seq = String(seqRow.seq).padStart(2, '0');
  const batchCode = ymd + '-' + seq;
  const batchId = Date.now().toString();

  const prodRow = db.prepare(
    `SELECT name FROM products WHERE prod_key=? AND company_code=?`
  ).get(prodKey, company);
  const prodName = prodRow ? prodRow.name : prodKey;

  const createTime = now.toLocaleString('zh-CN');

  db.prepare(`
    INSERT INTO batches(id, batch_code, company_code, prod_key, prod_name, color,
      qty, price, total_cost, status, create_time, wage_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in', ?, 0)
  `).run(batchId, batchCode, company, prodKey, prodName, color || null, qty, price, qty * price, createTime);

  res.json({
    id: batchId, batchCode, prodKey, prodName, color: color || null,
    qty, price, totalCost: qty * price, status: 'in',
    createTime, wageTotal: 0, deliveries: []
  });
});

// ── 出库 ──────────────────────────────────────────────────────
router.post('/:batchId/out', (req, res) => {
  const { company, batchId } = req.params;
  const { qty, manualWage } = req.body;
  if (!qty || qty <= 0) return res.status(400).json({ error: '请输入有效数量' });

  const db = getDb();
  const batch = db.prepare(`SELECT * FROM batches WHERE id=? AND company_code=?`).get(batchId, company);
  if (!batch) return res.status(404).json({ error: '批次不存在' });

  const deliveries = db.prepare(`SELECT * FROM batch_deliveries WHERE batch_id=?`).all(batchId);
  const alreadyOut = deliveries.reduce((s, d) => s + d.qty, 0);
  const remaining = batch.qty - alreadyOut;

  if (qty > remaining) return res.status(400).json({ error: `出库数量不能超过剩余 ${remaining} 件` });

  const cost = qty * batch.price;

  // 薪资：优先使用手动输入值
  let wageShare;
  if (manualWage !== undefined && manualWage !== null) {
    wageShare = Math.max(0, parseFloat(manualWage) || 0);
  } else {
    const alreadySharedWage = deliveries.reduce((s, d) => s + d.wage_share, 0);
    wageShare = Math.max(0, (batch.wage_total || 0) - alreadySharedWage);
  }
  const profit = cost - wageShare;
  const date = new Date().toLocaleString('zh-CN');

  const insertDelivery = db.prepare(`
    INSERT INTO batch_deliveries(batch_id, date, qty, cost, wage_share, profit)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertDelivery.run(batchId, date, qty, cost, wageShare, profit);

  // 更新批次汇总
  const totalOut = alreadyOut + qty;
  const newStatus = totalOut >= batch.qty ? 'out' : 'partial';
  const allDeliveries = db.prepare(`SELECT * FROM batch_deliveries WHERE batch_id=?`).all(batchId);
  const outCost = allDeliveries.reduce((s, d) => s + d.cost, 0);
  const totalProfit = allDeliveries.reduce((s, d) => s + d.profit, 0);

  db.prepare(`
    UPDATE batches SET out_qty=?, out_cost=?, profit=?, out_date=?, status=?
    WHERE id=?
  `).run(totalOut, outCost, totalProfit, date, newStatus, batchId);

  res.json({ ok: true, status: newStatus, totalOut, remaining: batch.qty - totalOut });
});

// ── 结束批次（报损）──────────────────────────────────────────
router.post('/:batchId/close', (req, res) => {
  const { company, batchId } = req.params;
  const { lossQty = 0, reason = '', remark = '' } = req.body;

  const db = getDb();
  const batch = db.prepare(`SELECT * FROM batches WHERE id=? AND company_code=?`).get(batchId, company);
  if (!batch) return res.status(404).json({ error: '批次不存在' });

  const deliveries = db.prepare(`SELECT * FROM batch_deliveries WHERE batch_id=?`).all(batchId);
  const finalProfit = deliveries.reduce((s, d) => s + d.profit, 0);
  const closedTime = new Date().toLocaleString('zh-CN');
  const lossReason = lossQty > 0 ? (reason + (remark ? '：' + remark : '')) : (remark || '');

  db.prepare(`
    UPDATE batches SET status='closed', closed_time=?, loss_qty=?, loss_reason=?, profit=?
    WHERE id=?
  `).run(closedTime, lossQty, lossReason, finalProfit, batchId);

  res.json({ ok: true, closedTime, finalProfit });
});

// ── 删除批次 ──────────────────────────────────────────────────
router.delete('/:batchId', (req, res) => {
  const { company, batchId } = req.params;
  const db = getDb();
  db.prepare(`DELETE FROM batch_deliveries WHERE batch_id=?`).run(batchId);
  db.prepare(`DELETE FROM batches WHERE id=? AND company_code=?`).run(batchId, company);
  res.json({ ok: true });
});

// ── 更新批次薪资总额（产量登记时累加）──────────────────────────
router.patch('/:batchId/wage', (req, res) => {
  const { company, batchId } = req.params;
  const { addWage } = req.body;
  if (addWage == null) return res.status(400).json({ error: 'addWage 必填' });

  const db = getDb();
  db.prepare(`UPDATE batches SET wage_total = wage_total + ? WHERE id=? AND company_code=?`)
    .run(addWage, batchId, company);
  res.json({ ok: true });
});

export default router;
