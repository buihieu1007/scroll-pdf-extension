function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

// Fetch the current tab title and pre-populate the filename input
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.title) {
    const sanitizedTitle = sanitizeFilename(tab.title);
    document.getElementById('fileNameInput').value = sanitizedTitle;
  }
});

document.getElementById('selectRoiBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.runtime.sendMessage({ action: 'activate_selection_bg', tabId: tab.id });
  window.close(); // Close the popup to let user select
});

function disableUi() {
  document.getElementById('captureBtn').disabled = true;
  document.getElementById('markdownBtn').disabled = true;
  document.getElementById('selectRoiBtn').disabled = true;
  document.getElementById('fileNameInput').disabled = true;
}

function enableUi() {
  document.getElementById('captureBtn').disabled = false;
  document.getElementById('markdownBtn').disabled = false;
  document.getElementById('selectRoiBtn').disabled = false;
  document.getElementById('fileNameInput').disabled = false;
}

document.getElementById('captureBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  
  let filename = document.getElementById('fileNameInput').value.trim();
  if (!filename) {
    filename = tab.title ? sanitizeFilename(tab.title) : 'Captured_Page';
  }
  
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf';
  }
  
  document.getElementById('status').innerText = 'Initializing capture...';
  disableUi();
  
  chrome.runtime.sendMessage({ 
    action: 'start_capture', 
    tabId: tab.id,
    filename: filename
  });
});

document.getElementById('markdownBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  let filename = document.getElementById('fileNameInput').value.trim();
  if (!filename) {
    filename = tab.title ? sanitizeFilename(tab.title) : 'Captured_Page';
  }

  if (!filename.toLowerCase().endsWith('.md')) {
    filename += '.md';
  }

  document.getElementById('status').innerText = 'Converting to Markdown...';
  disableUi();

  chrome.runtime.sendMessage({
    action: 'start_markdown_capture',
    tabId: tab.id,
    filename: filename
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'status') {
    document.getElementById('status').innerText = message.text;
  } else if (message.action === 'error') {
    document.getElementById('status').innerText = 'Error: ' + message.error;
    document.getElementById('status').style.color = '#d32f2f';
    enableUi();
  } else if (message.action === 'finished') {
    document.getElementById('status').innerText = 'Done! File generated and downloaded.';
    document.getElementById('status').style.color = '#388e3c';
    enableUi();
  }
});
