import { enableLogs } from "../config";
import { HideMethod } from "../messages";
import { ClickRule, ElementExistsRule, ElementVisibleRule, EvalRule } from "../rules";

// get or create a style container for CSS overrides
export function getStyleElementUtil(): HTMLStyleElement {
  const styleOverrideElementId = "autoconsent-css-rules";
  const styleSelector = `style#${styleOverrideElementId}`;
  const existingElement = document.querySelector(styleSelector);
  if (existingElement && existingElement instanceof HTMLStyleElement) {
    return existingElement;
  } else {
    const parent =
      document.head ||
      document.getElementsByTagName("head")[0] ||
      document.documentElement;
    const css = document.createElement("style");
    css.id = styleOverrideElementId;
    parent.appendChild(css);
    return css;
  }
}

// hide elements with a CSS rule
export function hideElementsUtil(
  selectors: string[],
  method: HideMethod
): boolean {
  const hidingSnippet = method === "display" ? `display: none` : `opacity: 0`;
  const rule = `${selectors.join(
    ","
  )} { ${hidingSnippet} !important; z-index: -1 !important; pointer-events: none !important; } `;
  const styleEl = getStyleElementUtil();
  if (styleEl instanceof HTMLStyleElement) {
    styleEl.innerText += rule;
    return selectors.length > 0;
  }
  return false;
}

export function click(ruleStep: ClickRule): boolean {
  const elem = document.querySelectorAll<HTMLElement>(ruleStep.click);
  enableLogs && console.log("[click]", ruleStep.click, elem);
  if (elem.length > 0) {
    if (ruleStep.all === true) {
      elem.forEach((e) => e.click());
    } else {
      elem[0].click();
    }
  }
  return elem.length > 0;
}

export function elementExists(ruleStep: ElementExistsRule): boolean {
  const exists = document.querySelector(ruleStep.exists) !== null;
  enableLogs && console.log("[exists?]", ruleStep.exists, exists);
  return exists;
}

export function elementVisible(ruleStep: ElementVisibleRule): boolean {
  const elem = document.querySelectorAll<HTMLElement>(ruleStep.visible);
    const results = new Array(elem.length);
    elem.forEach((e, i) => {
      // check for display: none
      results[i] = false;
      if (e.offsetParent !== null) {
        results[i] = true;
      } else {
        const css = window.getComputedStyle(e);
        if (css.position === 'fixed' && css.display !== "none") { // fixed elements may be visible even if the parent is not
          results[i] = true;
        }
      }
    });
    enableLogs && console.log("[visible?]", ruleStep.visible, elem, results);
    if (results.length === 0) {
      return false;
    } else if (ruleStep.check === "any") {
      return results.some(r => r);
    } else if (ruleStep.check === "none") {
      return results.every(r => !r);
    }
    // all
    return results.every(r => r);
}

export function doEval(ruleStep: EvalRule): boolean {
  // TODO: chrome support
  enableLogs && console.log("about to [eval]", ruleStep.eval); // this will not show in Webkit console
  const result = window.eval(ruleStep.eval); // eslint-disable-line no-eval
  return result;
}