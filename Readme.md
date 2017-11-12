# Jquery Puppeteer
Provides a proxy for a puppeteer `page` object, that will add jQuery on each call to `goto` and expose `page.evalJquery` method which gives you $.
Also ensures that there is no conflict with any other jQuery on the page by calling noConflict and assigning to `window[<random hash>]` so as not to interfere with any other functionality in the page. 

## Usage
Install with `yarn add @melb2991/jquery-puppeteer` or `npm install @melb2991/jquery-puppeteer --save`

```javascript
    const JQueryPuppeteer = require('@melb2991/jquery-puppeteer');

    const jqueryPuppeteer = new JQueryPuppeteer({
      noConflict: false, // defaults to true
      jQueryPath: '/my/special/path/jquery.js' // defaults to looking up jquery in node_modules with require.resolve
    });

    browser = await puppeteer.launch({
        headless: false
    });

    // Returns a proxy to page object, so all methods are 
    // the same as the original page object except for the addition of "evalJQuery()"
    const page = jqueryPuppeteer.getPageProxy(await browser.newPage());

    await page.goto('http://localhost:3030/demo.html');

    const selector = 'h1';
  
    const handle = await page.evalJQuery(($, selector) => {
      const h = $(selector).text();
      return h;
    }, selector); // pass in arguments

    const result = await handle.jsonValue();
```

## Caveats
- jQuery is added to the page on each call to goto(). If you are connecting to chrome remotely the script will be sent over the wire each time which is a significant overhead - in this case you would be better off using jquery hosted on a CDN, unfortunately jquery puppeteer doesn't support a remote script path - it should be easy to implement so would welcome a PR for it ;) - I just haven't had time yet.

- If using babel or typescript and targetting ES5 anonymous functions will end up being stringified to `function() {}`. Chrome does not allow unnamed
anonymous functions that are not assigned to a variable so it will fall over.