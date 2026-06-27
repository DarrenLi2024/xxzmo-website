// 生成 ADMIN_PASSWORD_HASH 和 JWT_SECRET
// 用法: node scripts/gen-passwd.js "你的新密码"

const crypto = require('crypto');

const password = process.argv[2];

if (!password || password.length < 3) {
  console.error('用法: node scripts/gen-passwd.js "你的新密码"');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('');
console.log('📋 请去 Vercel Dashboard → Settings → Environment Variables 中设置:');
console.log('');
console.log('┌────────────────────────────────────────────────────────────┐');
console.log('│ 变量名                    │ 值                            │');
console.log('├────────────────────────────────────────────────────────────┤');
console.log(`│ ADMIN_PASSWORD_HASH       │ ${hash} │`);
console.log(`│ JWT_SECRET                │ ${jwtSecret} │`);
console.log('└────────────────────────────────────────────────────────────┘');
console.log('');
console.log('⚠️  Vercel UI 中填写时不要加引号，直接粘贴原始值');
console.log('⚠️  改完后点 Save，然后触发一次 Redeploy');
console.log('');
