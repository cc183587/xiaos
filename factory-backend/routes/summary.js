import { Router } from 'express';
import { getDb } from '../config/database.js';

const router = Router({ mergeParams: true });
// 路由前缀：/api/companies/:company/summary

// ── 获取统计总览数据 ──────────────────────────────────────────
router.get('/', (req, res) => {
  const { company } = req.params;
  const db = getDb();

  const now = new Date();
  // 凌晨5点后才算新的一天
  if(now.getHours() < 5){
    now.setDate(now.getDate() - 1);
  }
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const thisYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let lastY = now.getFullYear(), lastM = now.getMonth(); // getMonth() = 当月-1，刚好是上月
  if (lastM < 1) { lastM = 12; lastY--; }
  const lastYM = `${lastY}-${String(lastM).padStart(2,'0')}`;

  // 辅助：把任意格式的日期字符串提取为 "YYYY-MM-DD"
  function normDate(str) {
    if (!str) return '';
    // ISO 格式：2026-03-29 或 2026-03-29 12:00:00
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    // zh-CN 格式：2026/3/29 或 2026/3/29 12:00:00
    const m = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    return str.slice(0, 10);
  }

  // 今日出货（兼容 ISO 格式 "2026-03-29 xx:xx" 和旧 zh-CN 格式 "2026/3/29 xx:xx"）
  const allTodayDeliveries = db.prepare(`
    SELECT d.qty, d.cost, d.profit, d.wage_share, d.date
    FROM batch_deliveries d
    JOIN batches b ON b.id = d.batch_id
    WHERE b.company_code=?
  `).all(company);
  const todayDeliveries = allTodayDeliveries.filter(d => normDate(d.date) === todayStr);

  const todayOutQty  = todayDeliveries.reduce((s,d)=>s+d.qty, 0);
  const todayRevenue = todayDeliveries.reduce((s,d)=>s+d.cost, 0);
  const todayWage    = todayDeliveries.reduce((s,d)=>s+d.wage_share, 0);
  const todayIncome  = todayRevenue - todayWage;

  // 按出货月份统计（本月/上月）
  function monthStats(ym) {
    const allDelivs = db.prepare(`
      SELECT d.qty, d.profit, d.wage_share, d.date, b.create_time
      FROM batch_deliveries d
      JOIN batches b ON b.id = d.batch_id
      WHERE b.company_code=?
    `).all(company);
    // JS层过滤，兼容两种日期格式
    const delivs = allDelivs.filter(d => normDate(d.date).slice(0,7) === ym);
    const outQty = delivs.reduce((s,d)=>s+d.qty,0);
    const profit = delivs.reduce((s,d)=>s+d.profit,0);
    const wage   = delivs.reduce((s,d)=>s+d.wage_share,0);

    // 在库量 = 该月入库总量 - 该月入库批次的已出库量（即尚未出完的库存）
    // 取该月创建的所有批次（兼容 ISO "2026-03" 和 zh-CN "2026/3" 格式）
    const allBatchesOfMonth = db.prepare(`SELECT * FROM batches WHERE company_code=?`).all(company);
    const monthBatches = allBatchesOfMonth.filter(b => {
      const ct = b.create_time || '';
      // 统一解析成 YYYY-MM
      let bym = '';
      if (/^\d{4}-\d{2}/.test(ct)) {
        bym = ct.slice(0, 7);
      } else {
        const mm = ct.match(/^(\d{4})\/(\d{1,2})/);
        if (mm) bym = `${mm[1]}-${mm[2].padStart(2,'0')}`;
      }
      return bym === ym;
    });
    const totalInQty   = monthBatches.reduce((s,b)=>s+b.qty, 0);
    const totalOutQty  = monthBatches.reduce((s,b)=>s+(b.out_qty||0), 0);
    const totalLossQty = monthBatches.reduce((s,b)=>s+(b.loss_qty||0), 0);
    const inQty = Math.max(0, totalInQty - totalOutQty - totalLossQty); // 在库 = 入库 - 已出库 - 报损

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
