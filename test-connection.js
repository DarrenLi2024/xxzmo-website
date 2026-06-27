const { Client } = require('pg');

const hosts = [
  'db.mtntmztcqhuqidyyygcs.supabase.co',
];

async function test() {
  for (const host of hosts) {
    for (const port of [5432, 6543]) {
      const client = new Client({
        host,
        port,
        database: 'postgres',
        user: 'postgres',
        password: '3k8vbtBXp_QKrHB',
        ssl: { rejectUnauthorized: false }
      });
      try {
        const start = Date.now();
        await client.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Host:', host, 'Port:', port, '- SUCCESS in', Date.now() - start, 'ms');
        await client.end();
        process.exit(0);
      } catch (err) {
        console.log('Host:', host, 'Port:', port, '- Failed:', err.message.split('\n')[0]);
      }
    }
  }
  console.log('All connections failed');
}

test();