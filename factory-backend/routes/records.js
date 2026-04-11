import { Router } from 'express';
import { getDb } from '../config/database.js';
import { sendServerChanMessage, buildRecordMessage } from '../services/serverchan.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, '..', 'serverchan.log');

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
// POST { empId, prodKey, date, processes: [{name, qty, price}], batchCode, regId?, isAdmin? }
router.post('/', (req, res) => {
  const { company } = req.params;
  const { empId, prodKey, date, processes, batchCode, regId, isAdmin } = req.body;
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
  db.exec('BEGIN');
  try {
    for (const p of processes) {
      insert.run(company, empId, date, prodKey, p.name, p.qty, p.price, now, finalRegId, batchCode || null);
    }
    db.exec('COMMIT');
  } catch(err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // 更新批次薪资
  if (batchCode) {
    const totalWage = processes.reduce((s, p) => s + p.qty * p.price, 0);
    const batch = db.prepare(`SELECT id FROM batches WHERE batch_code=? AND company_code=?`).get(batchCode, company);
    if (batch) {
      db.prepare(`UPDATE batches SET wage_total = wage_total + ? WHERE id=?`).run(totalWage, batch.id);
    }
  }

  // 发送 Server酱 微信推送提醒（仅员工登记时推送，管理员登记不推送）
  if (isAdmin) {
    console.error('[Server酱] 管理员登记，跳过推送');
    try {
      fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] 管理员登记，跳过推送\n`);
    } catch(e) { console.error('日志写入失败:', e.message); }
  } else {
  console.error('[Server酱] 开始推送处理');
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] 开始推送处理\n`);
  } catch(e) { console.error('日志写入失败:', e.message); }
  
  try {
    const settings = db.prepare(`SELECT serverchan_key FROM settings WHERE company_code=?`).get(company);
    console.error('[Server酱] settings查询:', settings);
    try {
      fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] settings查询: ${JSON.stringify(settings)}\n`);
    } catch(e) { console.error('日志写入失败:', e.message); }
    console.error('[Server酱] 检查serverchan_key:', settings?.serverchan_key ? '存在' : '不存在');
    try {
      fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] 检查serverchan_key: ${settings?.serverchan_key ? '存在' : '不存在'}\n`);
    } catch(e) { console.error('日志写入失败:', e.message); }
    
    if (settings?.serverchan_key) {
      try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] 进入推送逻辑\n`);
      } catch(e) { console.error('日志写入失败:', e.message); }
      console.error('[Server酱] 查询员工和产品信息...');
      let emp, prod;
      try {
        emp = db.prepare(`SELECT name FROM employees WHERE id=? AND company_code=?`).get(empId, company);
        console.error('[Server酱] 员工查询结果:', emp);
      } catch(e) {
        console.error('[Server酱] 员工查询失败:', e.message);
      }
      try {
        prod = db.prepare(`SELECT name FROM products WHERE prod_key=? AND company_code=?`).get(prodKey, company);
        console.error('[Server酱] 产品查询结果:', prod);
      } catch(e) {
        console.error('[Server酱] 产品查询失败:', e.message);
      }
      
      console.error('[Server酱] 构建消息, processes:', JSON.stringify(processes));
      let messageContent;
      try {
        messageContent = buildRecordMessage({
          empName: emp?.name || empId,
          empId,
          date,
          time: now,
          prodName: prod?.name || prodKey,
          batchCode,
          processes
        });
        console.error('[Server酱] 消息构建成功');
      } catch (buildErr) {
        console.error('[Server酱] 消息构建失败:', buildErr.message);
        throw buildErr;
      }

      // 异步发送推送，不阻塞响应
      console.error('[Server酱] 准备发送推送...');
      try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] 准备发送推送, sendKey=${settings.serverchan_key?.substring(0, 10) || 'null'}...\n`);
      } catch (e) {
        console.error('[Server酱] 日志写入失败:', e.message);
      }
      
      console.error('[Server酱] 调用sendServerChanMessage...');
      try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] 调用sendServerChanMessage\n`);
      } catch (e) {
        console.error('[Server酱] 日志写入失败:', e.message);
      }
      
      sendServerChanMessage({
        sendKey: settings.serverchan_key,
        title: `【${emp?.name || empId}】产量登记`,
        content: messageContent
      }).then(result => {
        const logMsg = `[${new Date().toISOString()}] 推送结果: success=${result.success}, message=${result.message}\n`;
        try {
          fs.writeFileSync(LOG_FILE, logMsg, { flag: 'a' });
        } catch (e) {
          console.error('[Server酱] 日志写入失败:', e.message);
        }
        if (result.success) {
          console.log(`[Server酱] 推送成功: ${empId} ${date}`);
        } else {
          console.error(`[Server酱] 推送失败: ${result.message}`);
        }
      }).catch(err => {
        const logMsg = `[${new Date().toISOString()}] 推送异常: ${err.message}\n`;
        try {
          fs.writeFileSync(LOG_FILE, logMsg, { flag: 'a' });
        } catch (e) {
          console.error('[Server酱] 日志写入失败:', e.message);
        }
        console.error('[Server酱] 推送异常:', err);
      });
    }
  } catch (pushErr) {
    console.error('[Server酱] 推送处理错误:', pushErr);
    // 推送失败不影响主流程
  }
  } // end of if (!isAdmin)

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
