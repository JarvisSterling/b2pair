const fs = require('fs');
const files = [
  'C:/Users/Kiro/b2pair-temp/src/app/dashboard/company/[companyId]/page.tsx',
  'C:/Users/Kiro/b2pair-temp/src/app/dashboard/events/[id]/exhibitors/page.tsx',
  'C:/Users/Kiro/b2pair-temp/src/app/dashboard/w/[workspaceId]/events/[eventId]/agenda/page.tsx',
  'C:/Users/Kiro/b2pair-temp/src/app/dashboard/w/[workspaceId]/events/[eventId]/check-in/page.tsx',
];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  const relevant = lines.filter(l =>
    l.includes('useSWRFetch') || l.includes('useRealtime') ||
    l.includes('mutate:') || l.includes('filter:') || l.includes('table:') ||
    l.includes('import {') || l.includes("from '@/hooks") || l.includes('useParams')
  ).slice(0, 30);
  console.log('=== ' + f.split('/').slice(-3).join('/') + ' ===');
  relevant.forEach(l => console.log(l));
  console.log('');
}
