chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start_capture') {
    startCapture(message.tabId, message.filename);
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
    // Give the content script a split second to initialize its listeners
    await new Promise(resolve => setTimeout(resolve, 100));
    await chrome.tabs.sendMessage(tabId, { action: 'activate_selection' });
  } catch(e) {
    console.error("Could not activate selection:", e);
    chrome.runtime.sendMessage({ 
      action: "error", 
      error: "Cannot run on this page. Chrome restricts extensions on system pages (like chrome://) and the Chrome Web Store." 
    });
  }
}

async function startCapture(tabId, filename) {
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
      // Give it a split second to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch(e) {
      console.error("Scripting error during injection:", e);
    }

    let dims;
    try {
      dims = await chrome.tabs.sendMessage(tabId, { action: "prepare_capture" });
    } catch (e) {
      throw new Error("Could not connect to the webpage. Try refreshing the page first.");
    }
    
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
      filename: filename || "Captured_Page.pdf"
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
