const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// שימוש בתוסף ה-Stealth למניעת חסימות
chromium.use(stealth);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  console.log(`Attempting to scrape: ${url}`);
  
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // חשוב לסביבת ענן
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // המתנה קלה לטעינת הנתונים
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => ({
      nextData: window.__NEXT_DATA__ || null,
      initialState: window.__PRELOADED_STATE__ || window.__INITIAL_STATE__ || null,
      title: document.title
    }));
    
    await browser.close();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Scrape Error:", error.message);
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

// נקודת בדיקה לראות שהשרת חי
app.get('/', (req, res) => res.send('Scraper is Online!'));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
