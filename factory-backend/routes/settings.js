import { Router } from 'express';
import { getDb } from '../config/database.js';
import { sendServerChanMessage, buildTestMessage } from '../services/serverchan.js';

const router = Router({ mergeParams: true });

// 获取公司设置
router.get('/', (req, res) => {
  const { company } = req.params;
  const db = getDb();
  
  try {
    const settings = db.prepare(`
      SELECT serverchan_key as serverchanKey
      FROM settings 
      WHERE company_code = ?
    `).get(company);
    
    res.json(settings || { serverchanKey: '' });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 保存 Server酱 配置
router.put('/serverchan', (req, res) => {
  const { company } = req.params;
  const { key } = req.body;
  const db = getDb();
  
  try {
    const now = new Date().toISOString();
    
    // 使用 INSERT OR REPLACE 简化逻辑
    db.prepare(`
      INSERT INTO settings (company_code, serverchan_key, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(company_code) DO UPDATE SET
        serverchan_key = excluded.serverchan_key,
        updated_at = excluded.updated_at
    `).run(company, key || null, now);
    
    res.json({ success: true, message: '设置已保存' });
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({ error: '保存设置失败' });
  }
});

// 测试 Server酱 推送
router.post('/serverchan/test', async (req, res) => {
  const { company } = req.params;
  const db = getDb();
  
  try {
    const settings = db.prepare(`
      SELECT serverchan_key 
      FROM settings 
      WHERE company_code = ?
    `).get(company);
    
    if (!settings?.serverchan_key) {
      return res.status(400).json({ error: '请先配置 Server酱 SendKey' });
    }
    
    const result = await sendServerChanMessage({
      sendKey: settings.serverchan_key,
      title: '🔔 产量登记系统 - 测试消息',
      content: buildTestMessage()
    });
    
    if (result.success) {
      res.json({ success: true, message: '测试消息已发送' });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('测试推送失败:', error);
    res.status(500).json({ error: '测试推送失败' });
  }
});

export default router;
