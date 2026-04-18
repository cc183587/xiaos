import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { initDb } from './scripts/initDb.js';
import { getDb } from './config/database.js';

import authRouter      from './routes/auth.js';
import employeeRouter  from './routes/employees.js';
import productRouter   from './routes/products.js';
import batchRouter     from './routes/batches.js';
import recordRouter    from './routes/records.js';
import summaryRouter   from './routes/summary.js';
import settingsRouter  from './routes/settings.js';
import stockRouter     from './routes/stock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// 初始化数据库
initDb();

const app = express();

// ── 中间件 ────────────────────────────────────────────────────
app.use(cors());
app.use(compression()); // Gzip压缩
app.use(express.json());

// 静态文件：提供前端 index.html（从上级目录），允许缓存1小时
app.use(express.static(path.join(__dirname, '..'), {
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      // HTML文件缓存1小时
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else {
      // 其他静态资源缓存7天
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// ── API 路由 ──────────────────────────────────────────────────
app.use('/api/auth',                               authRouter);
app.use('/api/companies/:company/employees',       employeeRouter);
app.use('/api/companies/:company/products',        productRouter);
app.use('/api/companies/:company/batches',         batchRouter);
app.use('/api/companies/:company/records',         recordRouter);
app.use('/api/companies/:company/summary',         summaryRouter);
app.use('/api/companies/:company/settings',        settingsRouter);
app.use('/api/companies/:company/stock',           stockRouter);

// ── 健康检查 ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── 数据完整导出（备份用）─────────────────────────────────────
app.get('/api/companies/:company/export', (req, res) => {
  const { company } = req.params;
  const db = getDb();

  const emps       = db.prepare(`SELECT * FROM employees WHERE company_code=?`).all(company);
  const products   = db.prepare(`SELECT * FROM products WHERE company_code=?`).all(company);
  const processes  = db.prepare(`SELECT * FROM processes WHERE company_code=?`).all(company);
  const batches    = db.prepare(`SELECT * FROM batches WHERE company_code=?`).all(company);
  const deliveries = db.prepare(`
    SELECT d.* FROM batch_deliveries d
    JOIN batches b ON b.id=d.batch_id WHERE b.company_code=?
  `).all(company);
  const records    = db.prepare(`SELECT * FROM records WHERE company_code=?`).all(company);

  res.setHeader('Content-Disposition', `attachment; filename="factory_${company}_backup.json"`);
  res.json({ company, emps, products, processes, batches, deliveries, records });
});

// ── 数据导入（恢复）─────────────────────────────────────────────
app.post('/api/companies/:company/import', (req, res) => {
  const { company } = req.params;
  const backup = req.body;
  if (!backup || backup.company !== company) {
    return res.status(400).json({ error: '备份文件与当前公司不匹配' });
  }
  const db = getDb();

  try {
    db.exec('BEGIN');

    // 清空该公司数据（保留公司记录本身）
    db.prepare(`DELETE FROM records         WHERE company_code=?`).run(company);
    db.prepare(`DELETE FROM batch_deliveries WHERE batch_id IN (SELECT id FROM batches WHERE company_code=?)`).run(company);
    db.prepare(`DELETE FROM batches         WHERE company_code=?`).run(company);
    db.prepare(`DELETE FROM processes       WHERE company_code=?`).run(company);
    db.prepare(`DELETE FROM products        WHERE company_code=?`).run(company);
    db.prepare(`DELETE FROM employees       WHERE company_code=?`).run(company);

    // 恢复员工
    const insEmp = db.prepare(`INSERT OR IGNORE INTO employees(id,company_code,name) VALUES(?,?,?)`);
    (backup.emps||[]).forEach(e => insEmp.run(e.id, company, e.name||''));

    // 恢复产品
    const insProd = db.prepare(`INSERT OR IGNORE INTO products(prod_key,company_code,name) VALUES(?,?,?)`);
    (backup.products||[]).forEach(p => insProd.run(p.prod_key, company, p.name));

    // 恢复工序
    const insProc = db.prepare(`INSERT INTO processes(id,prod_key,company_code,name,price,sort_order,remark) VALUES(?,?,?,?,?,?,?)`);
    (backup.processes||[]).forEach(p => insProc.run(p.id, p.prod_key, company, p.name, p.price, p.sort_order||0, p.remark||null));

    // 恢复批次
    const insBatch = db.prepare(`INSERT INTO batches(id,batch_code,company_code,prod_key,prod_name,color,qty,price,total_cost,status,create_time,wage_total,out_qty,out_cost,profit,out_date,closed_time,loss_qty,loss_reason)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    (backup.batches||[]).forEach(b => insBatch.run(b.id,b.batch_code,company,b.prod_key,b.prod_name,b.color||null,b.qty,b.price,b.total_cost,b.status,b.create_time,b.wage_total||0,b.out_qty||0,b.out_cost||0,b.profit||0,b.out_date||null,b.closed_time||null,b.loss_qty||0,b.loss_reason||null));

    // 恢复出货记录
    const insDeliv = db.prepare(`INSERT INTO batch_deliveries(id,batch_id,date,qty,cost,wage_share,profit) VALUES(?,?,?,?,?,?,?)`);
    (backup.deliveries||[]).forEach(d => insDeliv.run(d.id,d.batch_id,d.date,d.qty,d.cost,d.wage_share||0,d.profit||0));

    // 恢复产量记录
    const insRec = db.prepare(`INSERT INTO records(id,company_code,emp_id,date,prod_key,process_name,qty,price,time,reg_id,batch_code) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
    (backup.records||[]).forEach(r => insRec.run(r.id,company,r.emp_id,r.date,r.prod_key,r.process_name,r.qty,r.price,r.time||'',r.reg_id||0,r.batch_code||null));

    db.exec('COMMIT');
    res.json({ ok: true });
  } catch(e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 工厂管理系统后端已启动`);
  console.log(`   本机访问:   http://localhost:${PORT}`);
  console.log(`   局域网访问: http://<本机IP>:${PORT}`);
  console.log(`   前端页面:   http://localhost:${PORT}/index.html\n`);
});
