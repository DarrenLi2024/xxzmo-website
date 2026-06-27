#!/bin/bash
echo "=== 重启服务 ==="
kill -9 $(lsof -ti :3007) 2>/dev/null
kill -9 $(lsof -ti :3006) 2>/dev/null
sleep 1
cd /Users/lirundong/Projects/Active/xxzmo-website
source .env 2>/dev/null
export $(cat .env | xargs)
echo "启动服务: http://127.0.0.1:3007"
npx next start -p 3007
