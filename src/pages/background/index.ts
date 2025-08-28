let isConnected = false;
let apiKey: string | null = null;

async function loadApiKey() {
  const result = await chrome.storage.local.get(['zapApiKey']);
  if (result.zapApiKey) {
    apiKey = result.zapApiKey;
  }
}

loadApiKey();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.zapApiKey) {
    apiKey = changes.zapApiKey.newValue;
  }
});

async function testApiKey(keyToTest: string) {
  try {
    const response = await fetch('http://localhost:8080/JSON/core/view/version/', {
      headers: { 'Accept': 'application/json', 'X-ZAP-API-Key': keyToTest }
    });
    if (response.ok) {
      isConnected = true;
      return { success: true };
    } else {
      isConnected = false;
      return { success: false, error: `ZAP responded with status ${response.status}` };
    }
  } catch (error) {
    isConnected = false;
    return { success: false, error: 'Could not reach ZAP. Is it running?' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TEST_ZAP_CONNECTION') {
        testApiKey(message.key).then(response => {
            if(response.success) apiKey = message.key;
            sendResponse(response);
        });
        return true;
    }
    
    if (message.type === 'GET_ZAP_CONNECTION_STATUS') {
        sendResponse({ connected: isConnected });
        return;
    }
});