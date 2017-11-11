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
    this.jQueryGlobal = uid(5);
    this.options = options;
  }

  getPageProxy(page: puppeteer.Page): PageJQuery {
    const proxyPage = new Proxy(page, {
      get: (target: puppeteer.Page, property: string): any => {
        if (property === 'goto') {
          return async (url: string, options?: Partial<NavigationOptions>): Promise<Response> => {
            const response = await target.goto(url, options);
  
            // Create tmp script file and cache path
            if (!this.jQueryScript) {
              this.jQueryScript = await getJQueryScript(this.options.jQueryPath, this.jQueryGlobal);
            }

            await target.addScriptTag({
              path: this.jQueryScript
            });

            const waitFn = `!!window[${this.jQueryGlobal}]`;
            console.log(waitFn);
            await target.waitForFunction(waitFn);            

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

function getJQueryScript(pathToScript: string, globalName: string): Promise<string> {
  const noConflictStr = `\nvar ${globalName} = $.noConflict(true);`;

  return new Promise((resolve, reject) => {
      const tmpObj = tmp.file((err, path, fd, cleanup) => {
        console.log(`Writing jQuery script to: ${path}`);

        const handleError = (err: any) => {
          cleanup();
          return err;
        };

        const handleSuccess = () => {
          process.on('exit', () => cleanup);
          return resolve(path);
        }

        const target = fs.createWriteStream(path);
    
        const src = fs.createReadStream(pathToScript)
          .on('end', () => {
            console.log('Read stream ended!')
            target.write(noConflictStr, () => {
              target.close();
            });
          })
          .on('error', handleError);
          
        src.pipe(target)
          .on('close', handleSuccess)
          .on('error', handleError);
      });
  });
}