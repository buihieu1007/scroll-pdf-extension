chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start_capture') {
    startCapture(message.tabId, message.filename);
  } else if (message.action === 'start_markdown_capture') {
    startMarkdownCapture(message.tabId, message.filename);
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
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
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
    chrome.runtime.sendMessage({ action: "error", error: err.message || "Failed to capture or download PDF." });
  } finally {
    try { await chrome.tabs.sendMessage(tabId, { action: "cleanup_capture" }); } catch(e) {}
    try { await chrome.debugger.detach({ tabId: tabId }); } catch(e) {}
  }
}

async function startMarkdownCapture(tabId, filename) {
  try {
    chrome.runtime.sendMessage({ action: "status", text: "Injecting dependencies..." });
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['libs/turndown.js', 'content.js']
    });
    // Wait for the scripts to register
    await new Promise(resolve => setTimeout(resolve, 100));

    chrome.runtime.sendMessage({ action: "status", text: "Converting HTML to Markdown..." });

    const response = await chrome.tabs.sendMessage(tabId, { action: "generate_markdown" });
    if (!response || !response.markdown) {
      throw new Error("Failed to convert page content.");
    }

    chrome.runtime.sendMessage({ action: "status", text: "Downloading Markdown..." });

    const base64Data = btoa(unescape(encodeURIComponent(response.markdown)));
    chrome.downloads.download({
      url: "data:text/markdown;charset=utf-8;base64," + base64Data,
      filename: filename || "Captured_Page.md"
    }, () => {
      chrome.runtime.sendMessage({ action: "finished" });
    });

  } catch (err) {
    console.error("Markdown capture error:", err);
    chrome.runtime.sendMessage({ action: "error", error: err.message || "Failed to generate Markdown." });
  }
}
