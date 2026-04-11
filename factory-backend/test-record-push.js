// 测试产量登记推送功能
const fetch = require('node-fetch');

async function testRecordPush() {
  console.log('测试产量登记推送...');
  
  const url = 'http://localhost:3001/api/companies/A/records';
  const payload = {
    empId: 'A001',
    date: '2026-04-12',
    prodKey: 'P001',
    batchCode: 'B001',
    processes: [
      { name: '工序1', qty: 10, wage: 5 },
      { name: '工序2', qty: 5, wage: 3 }
    ]
  };

  try {
    console.log('发送请求到:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('响应状态:', response.status);
    const result = await response.json();
    console.log('响应结果:', result);
    
    if (response.status === 200) {
      console.log('✅ 产量登记成功');
    } else {
      console.log('❌ 产量登记失败:', result);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
  }
}

testRecordPush();