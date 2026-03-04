const fs = require('fs');
const path = require('path');

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results.push(...walk(full));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) results.push(full);
  }
  return results;
}

const base = 'C:/Users/Kiro/b2pair-temp/src/app/dashboard';
const files = walk(base);

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  if (!src.includes('useSWRFetch')) continue;

  // Detect any realtime usage
  const hasUseRealtime = src.includes('useRealtime(');
  const hasUseRealtimeMulti = src.includes('useRealtimeMulti(');
  const hasRawRealtime = src.includes('postgres_changes');

  // Find Realtime table subscriptions (useRealtime hook)
  const rtTables = [];
  const rtRe = /useRealtime\(\{[\s\S]*?table:\s*["']([^"']+)["']/g;
  let m;
  while ((m = rtRe.exec(src)) !== null) rtTables.push(m[1]);

  // Find useRealtimeMulti table entries
  if (hasUseRealtimeMulti) {
    const multiRe = /table:\s*["']([^"']+)["']/g;
    while ((m = multiRe.exec(src)) !== null) {
      if (!rtTables.includes(m[1])) rtTables.push(m[1] + ' (multi)');
    }
  }

  // Find mutate refs
  const mutateRe = /mutate:\s*(\w+)/g;
  const mutates = [];
  while ((m = mutateRe.exec(src)) !== null) mutates.push(m[1]);

  const name = f.replace(base + path.sep, '').replace(/\\/g, '/');
  const rtStatus = rtTables.length ? rtTables.join(', ') :
    (hasRawRealtime ? 'RAW_REALTIME' : '❌ NONE');
  console.log(`${name}`);
  console.log(`  RT: ${rtStatus}`);
  if (mutates.length) console.log(`  Mutates: ${mutates.join(', ')}`);
  console.log('');
}
