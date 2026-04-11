import { sendServerChanMessage, buildTestMessage } from './services/serverchan.js';

const sendKey = 'SCT333087TLK061hCsuFD10vUtrZ47dZo9';
console.error('Testing sendKey:', sendKey);

try {
    const result = await sendServerChanMessage({
        sendKey,
        title: '🔔 测试推送',
        content: buildTestMessage()
    });
    console.error('Result:', result);
} catch (error) {
    console.error('Error:', error);
}