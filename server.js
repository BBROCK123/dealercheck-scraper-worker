const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);
const app = express();
// חובה להשתמש בפורט שהמערכת מקצה - בלוגים ראינו שזה 10000
const PORT = process.env.PORT || 10000;

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  console.log(`Starting Scrape for: ${url}`);
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // השהיה של 5 שניות לטעינת נתונים
    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const jsonLd = scripts.map(s => {
        try { return JSON.parse(s.innerText); } catch (e) { return null; }
      }).filter(Boolean);

      return {
        jsonLd: jsonLd,
        nextData: window.__NEXT_DATA__ || null,
        title: document.title
      };
    });

    await browser.close();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Scrape Error:", error.message);
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => res.send('Server is Up!'));

app.listen(PORT, () => console.log(`Scraper is running on port ${PORT}`));
