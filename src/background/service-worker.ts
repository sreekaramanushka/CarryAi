// Background Service Worker for CarryAI

chrome.runtime.onInstalled.addListener(() => {
  console.log('CarryAI Extension installed and ready.');

  // Set side panel behavior to open when the extension icon is clicked
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Failed to set panel behavior:', error));
  }
});

// Listener for logging and utility tasks if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If we need background processes, they will be handled here
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return false;
});
