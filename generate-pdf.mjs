import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'B2Pair-Product-Map.html');
const pdfPath = path.join(__dirname, 'B2Pair-Product-Map.pdf');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' },
});
await browser.close();
console.log('PDF generated:', pdfPath);
