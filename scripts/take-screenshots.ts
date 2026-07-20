import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const screenshotDir = path.join(__dirname, '../public/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const url = 'http://localhost:3000/';

  const viewports = [
    { name: 'desktop-light', width: 1280, height: 800, dark: false },
    { name: 'desktop-dark', width: 1280, height: 800, dark: true },
    { name: 'tablet-light', width: 768, height: 1024, dark: false },
    { name: 'mobile-light', width: 375, height: 812, dark: false },
  ];

  for (const vp of viewports) {
    try {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (vp.dark) {
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
        });
        await page.waitForTimeout(1000);
      }

      const filePath = path.join(screenshotDir, `${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Successfully captured: ${vp.name} to ${filePath}`);
      await context.close();
    } catch (err) {
      console.error(`Failed to capture ${vp.name}:`, err);
    }
  }

  await browser.close();
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
