import { signToken, verifyToken } from './services/tokenAuth.js';

console.log('=== Token 测试 ===');
console.log('TOKEN_SECRET 存在:', !!process.env.TOKEN_SECRET);
console.log('TOKEN_SECRET 前10位:', process.env.TOKEN_SECRET?.slice(0, 10));

const token = signToken({ role: 'admin', companyCode: 'XS' });
console.log('生成Token:', token.slice(0, 40) + '...');

const verified = verifyToken(token);
console.log('验证结果:', verified ? '成功' : '失败');
