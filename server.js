const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// הפעלת תוסף Stealth למניעת חסימות בוטים
chromium.use(stealth);

const app = express();
// שימוש בפורט 10000 כפי שנדרש על ידי רנדר
const PORT = process.env.PORT || 10000;

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  console.log(`Starting Scrape for: ${url}`);
  let browser;
  
  try {
    // השקת דפדפן עם הגדרות מותאמות לשרת ענן
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // ניווט והמתנה לטעינה בסיסית של האתר
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // השהיה של 5 שניות כדי לעקוף הגנות אבטחה ולטעון נתונים
    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(() => {
      // שליפת נתוני JSON-LD (השיטה הכי אמינה לשנה, מחיר ודגם)
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

// דף בדיקה כדי לראות שהשרת עובד
app.get('/', (req, res) => res.send('Scraper is Live!'));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
