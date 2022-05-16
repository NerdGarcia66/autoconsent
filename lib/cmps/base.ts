/* eslint-disable no-restricted-syntax,no-await-in-loop,no-underscore-dangle */

import { AutoCMP } from "../types";
import { AutoConsentCMPRule, AutoConsentRuleStep, ClickRule, ElementExistsRule, ElementVisibleRule, EvalRule } from "../rules";
import { enableLogs } from "../config";
import { click, doEval, elementExists, elementVisible } from "../web/content-utils";

export async function waitFor(predicate: () => Promise<boolean> | boolean, maxTimes: number, interval: number): Promise<boolean> {
  let result = await predicate();
  if (!result && maxTimes > 0) {
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve(waitFor(predicate, maxTimes - 1, interval));
      }, interval);
    });
  }
  return Promise.resolve(result);
}


export async function success(action: Promise<boolean>): Promise<boolean> {
  const result = await action;
  if (!result) {
    throw new Error(`Action failed: ${action} ${result}`)
  }
  return result
}


export default class AutoConsentBase implements AutoCMP {

  name: string
  hasSelfTest = true

  constructor(name: string) {
    this.name = name;
  }

  detectCmp(): Promise<boolean>  {
    throw new Error('Not Implemented');
  }

  async detectPopup() {
    return false;
  }

  detectFrame(frame: { url: string }) {
    return false;
  }

  optOut(): Promise<boolean> {
    throw new Error('Not Implemented');
  }

  optIn(): Promise<boolean> {
    throw new Error('Not Implemented');
  }

  openCmp(): Promise<boolean> {
    throw new Error('Not Implemented');
  }

  async test(): Promise<boolean> {
    // try IAB by default
    return Promise.resolve(true);
  }
}

async function evaluateRule(rule: AutoConsentRuleStep) {
  const results = [];
  if (rule.exists) {
    results.push(elementExists(<ElementExistsRule>rule));
  }
  if (rule.visible) {
    results.push(elementVisible(<ElementVisibleRule>rule));
  }
  if (rule.eval) {
    results.push(doEval(<EvalRule>rule));
  }
  // if (rule.waitFor) {
  //   results.push(tab.waitForElement(rule.waitFor, rule.timeout || 10000, frameId));
  // }
  if (rule.click) {
    results.push(click(<ClickRule>rule));
  }
  // if (rule.waitForThenClick) {
  //   results.push(tab.waitForElement(rule.waitForThenClick, rule.timeout || 10000, frameId)
  //     .then(() => tab.clickElement(rule.waitForThenClick!, frameId)));
  // }
  // if (rule.wait) {
  //   results.push(tab.wait(rule.wait));
  // }
  // if (rule.goto) {
  //   results.push(tab.goto(rule.goto));
  // }
  // if (rule.hide) {
  //   results.push(tab.hideElements(rule.hide, frameId));
  // }
  // if (rule.undoHide) {
  //   results.push(tab.undoHideElements(frameId));
  // }
  // if (rule.waitForFrame) {
  //   results.push(waitFor(() => !!tab.frame, 40, 500))
  // }
  // boolean and of results
  return (await Promise.all(results)).reduce((a, b) => a && b, true);
}

export class AutoConsent extends AutoConsentBase {

  constructor(public config: AutoConsentCMPRule) {
    super(config.name);
  }

  get prehideSelectors(): string[] {
    return this.config.prehideSelectors;
  }

  get isHidingRule(): boolean {
    return this.config.isHidingRule;
  }

  async _runRulesParallel(rules: AutoConsentRuleStep[]): Promise<boolean> {
    const detections = await Promise.all(rules.map(rule => evaluateRule(rule)));
    return detections.every(r => !!r);
  }

  async _runRulesSequentially(rules: AutoConsentRuleStep[]): Promise<boolean> {
    for (const rule of rules) {
      enableLogs && console.log('Running rule...', rule);
      const result = await evaluateRule(rule);
      enableLogs && console.log('...rule result', result);
      if (!result && !rule.optional) {
        return false;
      }
    }
    return true;
  }

  async detectCmp() {
    if (this.config.detectCmp) {
      return this._runRulesParallel(this.config.detectCmp);
    }
    return false;
  }

  async detectPopup() {
    if (this.config.detectPopup) {
      return this._runRulesParallel(this.config.detectPopup);
    }
    return false;
  }

  detectFrame(frame: { url: string }) {
    if (this.config.frame) {
      return frame.url.startsWith(this.config.frame);
    }
    return false;
  }

  async optOut() {
    if (this.config.optOut) {
      enableLogs && console.log('Initiated optOut()', this.config.optOut);
      return this._runRulesSequentially(this.config.optOut);
    }
    return false;
  }

  async optIn() {
    if (this.config.optIn) {
      return this._runRulesSequentially(this.config.optIn);
    }
    return false;
  }

  async openCmp() {
    if (this.config.openCmp) {
      return this._runRulesSequentially(this.config.openCmp);
    }
    return false;
  }

  async test() {
    if (this.config.test) {
      return this._runRulesSequentially(this.config.test);
    }
    return super.test();
  }
}
