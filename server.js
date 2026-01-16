const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const app = express();

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000)); // המתנה של 5 שניות לטעינה מלאה
    const data = await page.evaluate(() => ({
      nextData: window.__NEXT_DATA__ || null,
      jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => JSON.parse(s.innerText))
    }));
    await browser.close();
    res.json({ success: true, data });
  } catch (e) {
    await browser.close();
    res.status(500).json({ success: false, error: e.message });
  }
});
app.listen(process.env.PORT || 3000);
