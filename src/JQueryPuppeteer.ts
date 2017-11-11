import * as puppeteer from 'puppeteer';
import { NavigationOptions, Response } from "puppeteer";
import * as path from 'path';
import * as serialize from 'serialize-javascript';
import * as fs from 'fs';
import * as uid from 'uid';
import * as tmp from 'tmp';
import * as jQuery from 'jquery';

export interface Options {
  jQueryPath: string
}

export type EvalJqueryFn = ($: JQueryStatic, ...args: any[]) => any;

export interface EvalJQuery {
  (evalJqueryFn: EvalJqueryFn, ...args: any[]): Promise<puppeteer.JSHandle>
}

export interface PageJQuery {
  evalJQuery: EvalJQuery,
  inject: (val: any) => Promise<puppeteer.JSHandle>,
  page: puppeteer.Page
}

const defaultOptions = {
  jQueryPath: path.join(__dirname, '../jquery/dist/jquery.min.js')
};

export default class JQueryPuppeteer {
  options: Options;
  jQueryScript: string;
  jQueryGlobal: string;

  constructor(options: Options = defaultOptions) {
    // Prepend underscore because sometimes uid will begin with a number
    this.jQueryGlobal = `_${uid(5)}`;
    this.jQueryScript = getJQueryScript(options.jQueryPath, this.jQueryGlobal);
    this.options = options;
  }

  getPageProxy(page: puppeteer.Page): PageJQuery {
    const proxyPage = new Proxy(page, {
      get: (target: puppeteer.Page, property: string): any => {
        if (property === 'goto') {
          return async (url: string, options?: Partial<NavigationOptions>): Promise<Response> => {
            const response = await target.goto(url, options);

            await target.addScriptTag({
              content: this.jQueryScript
            });         

            return response;
          }
        }
        return (target as any)[property];
      }
    })
  
    const evalJQuery = async (jqueryFn: EvalJqueryFn, ...args: any[]): Promise<any> => {
      const jqueryFnStr = serialize(jqueryFn);

      let window: any;

      const injectedFn = await inject(jqueryFn);
      
      return page.evaluateHandle((jQueryGlobalRef, injectedFn, ...args) => {
        return injectedFn(window[jQueryGlobalRef], ...args);
      }, this.jQueryGlobal, injectedFn, ...args);
    }

    async function inject(val: any) {
      const serialized = serialize(val);
      return page.evaluateHandle(serialized);
    }
  
    return {
      inject,
      page: proxyPage as puppeteer.Page,
      evalJQuery: evalJQuery
    };
  }
}

function getJQueryScript(pathToScript: string, globalName: string) {
  const noConflictStr = `\nvar ${globalName} = $.noConflict(true);`;  
  const script = fs.readFileSync(pathToScript, 'utf-8');
  return `${script}${noConflictStr}`;
}