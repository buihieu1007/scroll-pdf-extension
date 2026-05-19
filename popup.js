document.getElementById('selectRoiBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.runtime.sendMessage({ action: 'activate_selection_bg', tabId: tab.id });
  window.close(); // Close the popup to let user select
});

document.getElementById('captureBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  
  document.getElementById('status').innerText = 'Initializing capture...';
  document.getElementById('captureBtn').disabled = true;
  document.getElementById('selectRoiBtn').disabled = true;
  
  chrome.runtime.sendMessage({ action: 'start_capture', tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'status') {
    document.getElementById('status').innerText = message.text;
  } else if (message.action === 'error') {
    document.getElementById('status').innerText = 'Error: ' + message.error;
    document.getElementById('status').style.color = '#d32f2f';
    document.getElementById('captureBtn').disabled = false;
    document.getElementById('selectRoiBtn').disabled = false;
  } else if (message.action === 'finished') {
    document.getElementById('status').innerText = 'Done! PDF generated and downloaded.';
    document.getElementById('status').style.color = '#388e3c';
    document.getElementById('captureBtn').disabled = false;
    document.getElementById('selectRoiBtn').disabled = false;
  }
});
