import * as puppeteer from 'puppeteer';
import { NavigationOptions, Response, JSHandle } from "puppeteer";
import * as path from 'path';
import * as serialize from 'serialize-javascript';
import * as fs from 'fs';
import * as uid from 'uid';
import * as jQuery from 'jquery';

export interface Options {
  jQueryPath: string,
  noConflict: boolean
}

export type Serializer = typeof serialize;

export type EvalJqueryFn = ($: JQueryStatic, ...args: any[]) => any;

export interface EvalJQuery {
  (evalJqueryFn: EvalJqueryFn, ...args: any[]): Promise<JSHandle>
}

export interface EvalJqueryFnString {
  (jqueryFnString: string, ...args: any[]): Promise<JSHandle>
}

export interface JQueryPageProxy extends puppeteer.Page {
  evalJQuery: EvalJQuery,
  evalJQueryFnString: EvalJqueryFnString
}

export type InjectorFn = (val: any) => Promise<JSHandle>

const defaultOptions = {
  jQueryPath: require.resolve('jquery/dist/jquery.min.js'),
  noConflict: true
};

export default class JQueryPuppeteer {
  options: Options;
  jQueryScript: string;
  jQueryGlobal: string;

  constructor(options: Options = defaultOptions) {
    // Prepend underscore because sometimes uid will begin with a number
    this.jQueryGlobal = options.noConflict ? `_${uid(5)}` : '$';
    this.jQueryScript = getJQueryScript(options.jQueryPath, this.jQueryGlobal, options.noConflict);
    this.options = options;
  }

  getPageProxy(page: puppeteer.Page): JQueryPageProxy {
    const evalJqueryInjectedFn = async (injectedFn: JSHandle, ...args: any[]): Promise<JSHandle> => {
      let window: any;
    
      return page.evaluateHandle((jQueryGlobalRef, injectedFn, ...args) => {
        return injectedFn(window[jQueryGlobalRef], ...args);
      }, this.jQueryGlobal, injectedFn, ...args);
    }

    const evalJQueryFnString = async (jqueryFnStr: string, ...args: any[]) => {
      const injectedFn = await page.evaluateHandle(jqueryFnStr);
      return evalJqueryInjectedFn(injectedFn, ...args);
    }

    const evalJQuery = async (jqueryFn: EvalJqueryFn, ...args: any[]): Promise<JSHandle> => {
      const serialized = serialize(jqueryFn);      
      const injectedFn = await page.evaluateHandle(serialized);   

      return evalJqueryInjectedFn(injectedFn, ...args);
    };

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

        if (property === 'evalJQuery') {
          return evalJQuery;
        }

        if (property === 'evalJQueryFnString') {
          return evalJQueryFnString;
        }

        return (target as any)[property];
      }
    });
  
    return proxyPage as JQueryPageProxy;
  }
}

function getJQueryScript(pathToScript: string, globalName: string, noConflict: boolean) {
  const script = fs.readFileSync(pathToScript, 'utf-8');

  if (!noConflict) {
    return script;
  }

  const noConflictStr = `\nvar ${globalName} = $.noConflict(true);`;
  return `${script}${noConflictStr}`;
}