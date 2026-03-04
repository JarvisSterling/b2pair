const fs = require('fs');

function getTables(file) {
  const src = fs.readFileSync(file, 'utf8');
  const matches = src.match(/\.from\(["']([^"']+)["']\)/g) || [];
  return [...new Set(matches.map(m => m.replace(/\.from\(["']([^"']+)["']\)/, '$1')))];
}

// Check agenda API
try {
  const agendaTables = getTables('src/app/api/agenda/route.ts');
  console.log('Agenda API tables:', agendaTables.join(', '));
} catch(e) { console.log('Agenda API not found'); }

// Check exhibitors API
try {
  const exhibitorTables = getTables('src/app/api/events/[eventId]/exhibitors/route.ts');
  console.log('Exhibitors API tables:', exhibitorTables.join(', '));
} catch(e) { console.log('Exhibitors API not found'); }

// Company page - what mutates exist?
const compSrc = fs.readFileSync('src/app/dashboard/company/[companyId]/page.tsx', 'utf8');
const mutateLines = compSrc.split('\n').filter(l => l.includes('mutate'));
console.log('\nCompany page mutate refs:');
mutateLines.forEach(l => console.log(' ', l.trim()));
