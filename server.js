const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);
const app = express();
// חובה להשתמש בפורט 10000 כפי שמופיע בלוגים של Render
const PORT = process.env.PORT || 10000;

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // המתנה קלה לטעינת נתונים
    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(() => ({
      jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => JSON.parse(s.innerText)),
      nextData: window.__NEXT_DATA__ || null,
      title: document.title
    }));

    await browser.close();
    res.json({ success: true, data });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => res.send('Scraper is Live!'));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
