/**
 * 直接测试 Server酱 推送
 */

const API_BASE = 'https://sctapi.ftqq.com';
const SEND_KEY = 'SCT333087TLK061hCsuFD10vUtrZ47dZo9';

async function testPush() {
  console.log('开始测试 Server酱 推送...');
  console.log('SendKey:', SEND_KEY.substring(0, 10) + '...');
  
  try {
    const url = `${API_BASE}/${SEND_KEY}.send`;
    console.log('请求 URL:', url);
    
    const params = new URLSearchParams();
    params.append('title', '【测试】产量登记系统推送测试');
    params.append('desp', `## 🔔 测试消息\n\n您的 Server酱 推送配置已成功！\n\n**时间**: ${new Date().toLocaleString('zh-CN')}\n\n---\n*来自产量登记系统*`);

    console.log('请求参数:', params.toString());
    console.log('正在发送请求...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('响应结果:', JSON.stringify(result, null, 2));

    if (result.code === 0) {
      console.log('✅ 推送成功！');
    } else {
      console.log('❌ 推送失败:', result.message);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testPush();
