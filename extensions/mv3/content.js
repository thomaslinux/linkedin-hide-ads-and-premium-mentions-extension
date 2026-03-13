(async () => {
  const { userstyleCSS, userstyleVars } = await chrome.storage.local.get([
    "userstyleCSS",
    "userstyleVars"
  ]);
  if (!userstyleCSS || !userstyleVars) return;

  const finalCSS = buildCSS(userstyleCSS, userstyleVars);

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-linkedin-userstyle", "true");
  styleEl.textContent = finalCSS;
  document.documentElement.appendChild(styleEl);

  // Re-apply when popup changes settings
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "rebuildCSS") {
      chrome.storage.local.get(["userstyleCSS", "userstyleVars"], ({ userstyleCSS, userstyleVars }) => {
        const css = buildCSS(userstyleCSS, userstyleVars);
        styleEl.textContent = css;
      });
    }
  });
})();

/**
 * Very simple parser tailored to this style:
 * @-moz-document domain("linkedin.com") {
 *   if varName {
 *     ...
 *   }
 *   if otherVar {
 *     ...
 *   }
 * }
 */
function buildCSS(source, varsState) {
  // Remove header comment and @-moz-document wrapper
  let code = source;

  // Remove leading comment block
  code = code.replace(/\/\*[\s\S]*?\*\//, "");

  // Extract inside of @-moz-document
  const docMatch = code.match(/@-moz-document[^{]+\{([\s\S]*)\}\s*$/);
  if (!docMatch) return "";
  code = docMatch[1];

  let result = "";

  const ifRegex = /if\s+([a-zA-Z0-9_]+)\s*\{/g;
  let lastIndex = 0;
  let m;

  while ((m = ifRegex.exec(code)) !== null) {
    const varName = m[1];
    const startBlock = ifRegex.lastIndex;

    // Find matching brace for this block
    let depth = 1;
    let i = startBlock;
    for (; i < code.length; i++) {
      const ch = code[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          break;
        }
      }
    }
    const endBlock = i;
    const blockContent = code.slice(startBlock, endBlock).trim();

    const enabled = varsState[varName]?.enabled;
    if (enabled) {
      result += blockContent + "\n";
    }
    lastIndex = endBlock + 1; // skip closing brace
    ifRegex.lastIndex = lastIndex;
  }

  // Any leftover non-conditional CSS (if the style ever has it)
  const tail = code.slice(lastIndex).trim();
  if (tail) {
    result += "\n" + tail;
  }

  return result;
}
