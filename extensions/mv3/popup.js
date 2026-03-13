document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("vars");
  const { userstyleVars } = await chrome.storage.local.get("userstyleVars");

  if (!userstyleVars || Object.keys(userstyleVars).length === 0) {
    container.textContent = "No options found (style not fetched yet).";
    return;
  }

  Object.entries(userstyleVars).forEach(([id, info]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "var-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = info.enabled;

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = info.label || id;

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
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
});
