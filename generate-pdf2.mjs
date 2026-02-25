import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${path.join(__dirname, 'B2Pair-Complete-Reference.html')}`, { waitUntil: 'networkidle0' });
await page.pdf({
  path: path.join(__dirname, 'B2Pair-Complete-Reference.pdf'),
  format: 'A4',
  printBackground: true,
  margin: { top: '1.2cm', bottom: '1.2cm', left: '1.5cm', right: '1.5cm' },
});
await browser.close();
console.log('Done');
