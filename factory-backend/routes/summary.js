import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router({ mergeParams: true });
// 路由前缀：/api/companies/:company/summary

// ── 获取统计总览数据 ──────────────────────────────────────────
router.get('/', (req, res) => {
  const { company } = req.params;
  const db = getDb();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let lastY = now.getFullYear(), lastM = now.getMonth(); // getMonth() = 当月-1，刚好是上月
  if (lastM < 1) { lastM = 12; lastY--; }
  const lastYM = `${lastY}-${String(lastM).padStart(2,'0')}`;

  // 今日出货
  const todayDeliveries = db.prepare(`
    SELECT d.qty, d.cost, d.profit, d.wage_share
    FROM batch_deliveries d
    JOIN batches b ON b.id = d.batch_id
    WHERE b.company_code=? AND substr(d.date,1,10) = ?
  `).all(company, todayStr);

  const todayOutQty  = todayDeliveries.reduce((s,d)=>s+d.qty, 0);
  const todayRevenue = todayDeliveries.reduce((s,d)=>s+d.cost, 0);
  const todayWage    = todayDeliveries.reduce((s,d)=>s+d.wage_share, 0);
  const todayIncome  = todayRevenue - todayWage;

  // 按出货月份统计（本月/上月）
  function monthStats(ym) {
    const delivs = db.prepare(`
      SELECT d.qty, d.profit, d.wage_share, b.create_time
      FROM batch_deliveries d
      JOIN batches b ON b.id = d.batch_id
      WHERE b.company_code=? AND substr(d.date,1,7) = ?
    `).all(company, ym);
    const outQty = delivs.reduce((s,d)=>s+d.qty,0);
    const profit = delivs.reduce((s,d)=>s+d.profit,0);
    const wage   = delivs.reduce((s,d)=>s+d.wage_share,0);

    // 入库量：该月创建的批次
    const inRow = db.prepare(`
      SELECT COALESCE(SUM(qty),0) as total FROM batches
      WHERE company_code=? AND substr(create_time,1,7)=?
    `).get(company, ym.replace('-','/'));
    // 兼容 zh-CN 格式 "2026/3/25"
    const inRow2 = db.prepare(`
      SELECT COALESCE(SUM(qty),0) as total FROM batches
      WHERE company_code=? AND (
        substr(create_time,1,4)||'-'||printf('%02d',CAST(substr(create_time,6,instr(substr(create_time,6),'/')-1) AS INTEGER)) = ?
        OR substr(create_time,1,7) = ?
      )
    `).get(company, ym, ym.replace('-','/'));
    const inQty = inRow2 ? inRow2.total : 0;

    return { inQty, outQty, profit, wage };
  }

  const thisMonth = monthStats(thisYM);
  const lastMonth = monthStats(lastYM);

  // 累计
  const allBatches = db.prepare(`SELECT * FROM batches WHERE company_code=?`).all(company);
  const allDeliveries = db.prepare(`
    SELECT d.* FROM batch_deliveries d
    JOIN batches b ON b.id=d.batch_id
    WHERE b.company_code=?
  `).all(company);
  const allInQty  = allBatches.reduce((s,b)=>s+b.qty,0);
  const allOutQty = allDeliveries.reduce((s,d)=>s+d.qty,0);
  const allProfit = allDeliveries.reduce((s,d)=>s+d.profit,0);
  const allWage   = allDeliveries.reduce((s,d)=>s+d.wage_share,0);

  res.json({
    today: { outQty: todayOutQty, revenue: todayRevenue, wage: todayWage, income: todayIncome },
    thisMonth,
    lastMonth,
    all: { inQty: allInQty, outQty: allOutQty, profit: allProfit, wage: allWage }
  });
});

export default router;
