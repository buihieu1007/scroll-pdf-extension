chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start_capture') {
    startCapture(message.tabId);
  } else if (message.action === 'activate_selection_bg') {
    activateSelection(message.tabId);
  }
});

async function activateSelection(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  } catch(e) {
    console.error("Scripting error:", e);
  }
  chrome.tabs.sendMessage(tabId, { action: 'activate_selection' });
}

async function startCapture(tabId) {
  try {
    await chrome.debugger.attach({ tabId: tabId }, "1.3");
  } catch (err) {
    chrome.runtime.sendMessage({ action: "error", error: "Failed to attach debugger. Are you on a restricted page (like chrome://)?" });
    return;
  }

  chrome.runtime.sendMessage({ action: "status", text: "Analyzing layout..." });

  try {
    // Inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
    } catch(e) {}

    const dims = await chrome.tabs.sendMessage(tabId, { action: "prepare_capture" });
    const paperWidth = dims.width / 96;
    const paperHeight = dims.height / 96;

    chrome.runtime.sendMessage({ action: "status", text: "Generating continuous PDF..." });

    // Capture single giant PDF page
    const { data } = await chrome.debugger.sendCommand({ tabId: tabId }, "Page.printToPDF", {
      printBackground: true,
      paperWidth: paperWidth,
      paperHeight: paperHeight,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      pageRanges: "1",
      preferCSSPageSize: true
    });

    chrome.runtime.sendMessage({ action: "status", text: "Downloading PDF..." });

    chrome.downloads.download({
      url: "data:application/pdf;base64," + data,
      filename: "Captured_Page.pdf"
    }, () => {
      chrome.runtime.sendMessage({ action: "finished" });
    });

  } catch(err) {
    console.error("Capture error:", err);
    chrome.runtime.sendMessage({ action: "error", error: "Failed to capture or download PDF." });
  } finally {
    try { await chrome.tabs.sendMessage(tabId, { action: "cleanup_capture" }); } catch(e) {}
    try { await chrome.debugger.detach({ tabId: tabId }); } catch(e) {}
  }
}
