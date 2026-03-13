chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyUpdate", { periodInMinutes: 1440 }); // 24 hours
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dailyUpdate") {
    try {
      const res = await fetch("https://userstyles.world/api/style/25558");
      const styleData = await res.json();
      await chrome.storage.local.set({ styleData, lastUpdate: Date.now() });
    } catch (e) {
      console.error("Daily update failed:", e);
    }
  }
});
