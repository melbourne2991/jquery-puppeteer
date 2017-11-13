import * as puppeteer from 'puppeteer';
import JQueryPuppeteer from '../src';
import * as path from 'path';

describe('jQuery Puppeteer', () => {
  let browser: puppeteer.Browser;

  it('should allow you to use jQuery', async () => {
    const jqueryPuppeteer = new JQueryPuppeteer();

    browser = await puppeteer.launch({
        headless: false
    });

    const page = jqueryPuppeteer.getPageProxy(await browser.newPage());

    await page.goto('http://localhost:3030/demo.html');

    const selector = 'h1';

    const handle = await page.evalJQuery(($, selector) => {
      const h = $(selector).text();
      return h;
    }, selector);

    const result = await handle.jsonValue();

    expect(result).toBe('Welcome!');
  });

  it('should take strings', async () => {
    const jqueryPuppeteer = new JQueryPuppeteer();
    
    browser = await puppeteer.launch({
        headless: false
    });

    const page = jqueryPuppeteer.getPageProxy(await browser.newPage());

    await page.goto('http://localhost:3030/demo.html');

    const selector = 'h1';

    const handle = await page.evalJQueryFnString(`($, selector) => {
      const h = $(selector).text();
      return h;
    }`, selector);

    const result = await handle.jsonValue();

    expect(result).toBe('Welcome!');
  })

  afterEach(async () => {
    browser.close();
  });
});