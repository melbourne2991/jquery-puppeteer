import * as puppeteer from 'puppeteer';
import JQueryPuppeteer from '../src';
import * as path from 'path';

describe('jQuery Puppeteer', () => {
  let browser: puppeteer.Browser;

  it('should do something', async () => {
    const jqueryPuppeteer = new JQueryPuppeteer({
      jQueryPath: path.join(__dirname, '../node_modules/jquery/dist/jquery.min.js')
    });

    browser = await puppeteer.launch({
        headless: false
    });

    const { page, evalJQuery, inject } = jqueryPuppeteer.getPageProxy(await browser.newPage());

    await page.goto('http://localhost:3030/demo.html');

    // const selector = await inject('h1');

    const selector = 'h1'

    const handle = await evalJQuery(($, selector) => {
      const h = $(selector).text();
      return h;
    }, selector);

    const result = await handle.jsonValue();

    expect(result).toBe('Welcome!');
  });

  afterEach(async () => {
    // browser.close();
  });
});