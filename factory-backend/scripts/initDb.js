import { getDb, DB_PATH } from '../config/database.js';

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      code      TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      prefix    TEXT NOT NULL,
      admin_pwd TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id           TEXT NOT NULL,
      company_code TEXT NOT NULL,
      name         TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (id, company_code)
    );

    CREATE TABLE IF NOT EXISTS products (
      prod_key     TEXT NOT NULL,
      company_code TEXT NOT NULL,
      name         TEXT NOT NULL,
      PRIMARY KEY (prod_key, company_code)
    );

    CREATE TABLE IF NOT EXISTS processes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      prod_key     TEXT NOT NULL,
      company_code TEXT NOT NULL,
      name         TEXT NOT NULL,
      price        REAL NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      remark       TEXT
    );

    CREATE TABLE IF NOT EXISTS batches (
      id           TEXT PRIMARY KEY,
      batch_code   TEXT NOT NULL,
      company_code TEXT NOT NULL,
      prod_key     TEXT NOT NULL,
      prod_name    TEXT NOT NULL,
      color        TEXT,
      qty          INTEGER NOT NULL,
      price        REAL NOT NULL,
      total_cost   REAL NOT NULL,
      status       TEXT NOT NULL DEFAULT 'in',
      create_time  TEXT NOT NULL,
      wage_total   REAL NOT NULL DEFAULT 0,
      out_qty      INTEGER NOT NULL DEFAULT 0,
      out_cost     REAL NOT NULL DEFAULT 0,
      profit       REAL NOT NULL DEFAULT 0,
      out_date     TEXT,
      closed_time  TEXT,
      loss_qty     INTEGER NOT NULL DEFAULT 0,
      loss_reason  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_batches_company ON batches(company_code);
    CREATE INDEX IF NOT EXISTS idx_batches_status  ON batches(status);

    CREATE TABLE IF NOT EXISTS batch_deliveries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id   TEXT NOT NULL,
      date       TEXT NOT NULL,
      qty        INTEGER NOT NULL,
      cost       REAL NOT NULL,
      wage_share REAL NOT NULL DEFAULT 0,
      profit     REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_batch ON batch_deliveries(batch_id);

    CREATE TABLE IF NOT EXISTS batch_seq (
      company_code TEXT NOT NULL,
      ymd          TEXT NOT NULL,
      seq          INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (company_code, ymd)
    );

    CREATE TABLE IF NOT EXISTS records (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      company_code TEXT NOT NULL,
      emp_id       TEXT NOT NULL,
      date         TEXT NOT NULL,
      prod_key     TEXT NOT NULL,
      process_name TEXT NOT NULL,
      qty          INTEGER NOT NULL,
      price        REAL NOT NULL,
      time         TEXT NOT NULL,
      reg_id       INTEGER NOT NULL DEFAULT 0,
      batch_code   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_records_company  ON records(company_code);
    CREATE INDEX IF NOT EXISTS idx_records_emp_date ON records(emp_id, date);
    CREATE INDEX IF NOT EXISTS idx_records_date     ON records(date);

    CREATE TABLE IF NOT EXISTS reg_seq (
      company_code TEXT PRIMARY KEY,
      seq          INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 数据库迁移：如果 processes 表没有 remark 列则添加
  try {
    db.exec(`ALTER TABLE processes ADD COLUMN remark TEXT`);
  } catch(e) {
    // 列已存在，忽略
  }

  // 默认公司
  const insertCompany = db.prepare(
    `INSERT OR IGNORE INTO companies(code,name,prefix,admin_pwd) VALUES(?,?,?,?)`
  );
  insertCompany.run('A', 'A公司', 'a', 'XS');
  insertCompany.run('B', 'Q公司', 'q', 'gch');

  // 默认员工
  const insertEmp = db.prepare(
    `INSERT OR IGNORE INTO employees(id,company_code,name) VALUES(?,?,?)`
  );
  [['A001','A','张三'],['A002','A','李四'],
   ['Q001','B','张三'],['Q002','B','李四']].forEach(r => insertEmp.run(...r));

  // 默认产品和工序
  const insertProd = db.prepare(
    `INSERT OR IGNORE INTO products(prod_key,company_code,name) VALUES(?,?,?)`
  );
  const insertProc = db.prepare(
    `INSERT INTO processes(prod_key,company_code,name,price,sort_order) VALUES(?,?,?,?,?)`
  );

  const defaultProducts = {
    X3: { name: '音箱(X3)', processes: [
      {n:'贴电池',p:0.01},{n:'贴喇叭',p:0.01},{n:'贴按键',p:0.015},
      {n:'放按键',p:0.015},{n:'点喇叭',p:0.05},{n:'点板',p:0.1},
      {n:'装电板',p:0.02},{n:'组装',p:0.1},{n:'打螺丝',p:0.015},{n:'贴硅胶',p:0.015}
    ]},
    F9: { name: '头弓耳机(F9)', processes: [
      {n:'穿线',p:0.02},{n:'贴棉+过线',p:0.04},{n:'打锁扣',p:0.1},
      {n:'内外匙',p:0.08},{n:'反螺丝',p:0.05},{n:'打叉',p:0.15},{n:'打叉螺丝',p:0.05}
    ]}
  };

  for (const code of ['A', 'B']) {
    for (const [key, prod] of Object.entries(defaultProducts)) {
      insertProd.run(key, code, prod.name);
      const alreadyHas = db.prepare(
        `SELECT COUNT(*) as c FROM processes WHERE prod_key=? AND company_code=?`
      ).get(key, code).c;
      if (alreadyHas === 0) {
        prod.processes.forEach((p, i) => insertProc.run(key, code, p.n, p.p, i));
      }
    }
  }

  console.log('✅ 数据库初始化完成：', DB_PATH);
}

// 如果直接运行此脚本
if (process.argv[1].endsWith('initDb.js')) {
  initDb();
}
