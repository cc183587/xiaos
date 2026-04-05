/**
 * Server酱推送服务
 * 文档: https://sct.ftqq.com/
 */

const API_BASE = 'https://sctapi.ftqq.com';

/**
 * 发送 Server酱 消息
 * @param {Object} options
 * @param {string} options.sendKey - Server酱 SendKey
 * @param {string} options.title - 消息标题
 * @param {string} options.content - 消息内容（支持 Markdown）
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function sendServerChanMessage({ sendKey, title, content }) {
  if (!sendKey) {
    return { success: false, message: 'SendKey 不能为空' };
  }

  try {
    const url = `${API_BASE}/${sendKey}.send`;
    
    const params = new URLSearchParams();
    params.append('title', title || '产量登记提醒');
    if (content) {
      params.append('desp', content);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    if (result.code === 0) {
      return { 
        success: true, 
        message: '推送成功',
        data: result.data
      };
    } else {
      return { 
        success: false, 
        message: result.message || `推送失败 (code: ${result.code})` 
      };
    }
  } catch (error) {
    console.error('[Server酱] 推送异常:', error);
    return { 
      success: false, 
      message: `网络错误: ${error.message}` 
    };
  }
}

/**
 * 构建产量登记消息内容
 * @param {Object} record
 * @returns {string} Markdown 格式消息
 */
export function buildRecordMessage(record) {
  const { empName, empId, date, time, prodName, batchCode, processes } = record;
  
  let content = `## 📋 产量登记通知

**员工**: ${empName} (${empId})  
**日期**: ${date}  
**时间**: ${time}  
**产品**: ${prodName}${batchCode ? `  
**批次**: ${batchCode}` : ''}

---

### 工序明细

| 工序 | 数量 | 单价 | 小计 |
|------|------|------|------|
`;

  let totalQty = 0;
  let totalWage = 0;

  for (const p of processes) {
    const subtotal = p.qty * p.price;
    totalQty += p.qty;
    totalWage += subtotal;
    content += `| ${p.name} | ${p.qty} | ¥${p.price.toFixed(2)} | ¥${subtotal.toFixed(2)} |\n`;
  }

  content += `
---

**合计数量**: ${totalQty} 件  
**合计工资**: ¥${totalWage.toFixed(2)}

---
*来自产量登记系统*
`;

  return content;
}

/**
 * 构建测试消息
 * @returns {string} Markdown 格式消息
 */
export function buildTestMessage() {
  return `## 🔔 测试消息

您的 Server酱 推送配置已成功！

**时间**: ${new Date().toLocaleString('zh-CN')}

---
*来自产量登记系统*
`;
}
