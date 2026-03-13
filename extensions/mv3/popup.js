document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("vars");
  const { userstyleCSS, userstyleVars } = await chrome.storage.local.get([
    "userstyleCSS",
    "userstyleVars",
  ]);

  if (
    !userstyleCSS ||
    !userstyleVars ||
    Object.keys(userstyleVars).length === 0
  ) {
    container.textContent = "No options found (style not fetched yet).";
    return;
  }

  // Parse sections from CSS comments like "# Premium checkboxes"
  const sections = parseSections(userstyleCSS);

  // Group vars by section
  const groupedVars = {};
  Object.entries(userstyleVars).forEach(([id, info]) => {
    const section = sections[id] || "Other";
    if (!groupedVars[section]) groupedVars[section] = [];
    groupedVars[section].push({ id, ...info });
  });

  // Render sections
  Object.entries(groupedVars).forEach(([sectionName, vars]) => {
    // Section header
    const sectionDiv = document.createElement("div");
    sectionDiv.style.marginBottom = "12px";
    sectionDiv.innerHTML = `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">${sectionName}</h3>`;
    container.appendChild(sectionDiv);

    // Checkboxes for this section
    vars.forEach(({ id, label, enabled }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "var-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = id;
      checkbox.checked = enabled;

      const labelEl = document.createElement("label");
      labelEl.htmlFor = id;
      labelEl.textContent = label || id;
      labelEl.style.cursor = "pointer";

      checkbox.addEventListener("change", async () => {
        const stored = await chrome.storage.local.get("userstyleVars");
        const vars = stored.userstyleVars || {};
        if (!vars[id]) return;
        vars[id].enabled = checkbox.checked;
        await chrome.storage.local.set({ userstyleVars: vars });

        // Tell content script to rebuild CSS
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (!tab || !tab.id) return;
          chrome.tabs.sendMessage(tab.id, { type: "rebuildCSS" });
        });
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(labelEl);
      sectionDiv.appendChild(wrapper);
    });
  });
});

/**
 * Extract section names from # comments in userstyle code
 * Maps each @var checkbox to its section based on comment order
 */
function parseSections(cssCode) {
  const sections = {};
  const varOrder = [];

  // Extract @var checkbox lines to know processing order
  const varRegex = /@var\s+checkbox\s+([^\s]+)\s+"[^"]*"\s+[01]/g;
  let match;
  while ((match = varRegex.exec(cssCode)) !== null) {
    varOrder.push(match[1]);
  }

  // Find # section headers and associate vars that follow
  const sectionRegex = /#\s*([^\n\r]+)/g;
  let currentSection = "Other";
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(cssCode)) !== null) {
    currentSection = sectionMatch[1].trim();

    // Find next @var checkbox after this section header
    const afterSection = sectionRegex.lastIndex;
    const nextVarMatch = varRegex.exec(cssCode);

    if (nextVarMatch && nextVarMatch.index >= afterSection) {
      sections[nextVarMatch[1]] = currentSection;
      // Skip this var so next iteration gets the following one
      varRegex.lastIndex = nextVarMatch.index + nextVarMatch[0].length;
    }
  }

  // Assign remaining vars to last section or "Other"
  for (const varId of varOrder) {
    if (!sections[varId]) {
      sections[varId] = currentSection;
    }
  }

  return sections;
}
