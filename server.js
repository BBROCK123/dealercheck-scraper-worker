const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);
const app = express();

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  console.log(`Deep Scanning: ${url}`);
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // דימוי התנהגות אנושית - תנועת עכבר וזמן המתנה
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.mouse.move(100, 100);
    await new Promise(r => setTimeout(r, 3000)); // המתנה של 3 שניות לטעינת ה-JS

    const data = await page.evaluate(() => {
      // ניסיון לשלוף נתונים מכמה מקורות במקביל
      const nextData = document.getElementById('__NEXT_DATA__');
      const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                        .map(s => JSON.parse(s.innerText));
      
      return {
        nextData: nextData ? JSON.parse(nextData.innerText) : null,
        jsonLd: jsonLd,
        title: document.title
      };
    });
    
    await browser.close();
    res.json({ success: true, data });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000);
