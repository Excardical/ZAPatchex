import Browser from 'webextension-polyfill';

console.log('ZAPatchex background script loaded.');

// This listener runs when the extension is installed or updated.
Browser.runtime.onInstalled.addListener(() => {
  console.log('ZAPatchex extension has been installed/updated.');

  // Set the behavior for the side panel to open when the toolbar icon is clicked.
  Browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));

  // Create a context menu item to open the side panel as another option.
  Browser.contextMenus.create({
    id: 'open-side-panel',
    title: 'Open ZAPatchex',
    contexts: ['all']
  });
});

// This listener handles the click on the context menu item.
Browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-side-panel' && tab?.id) {
    Browser.sidePanel.open({ tabId: tab.id });
  }
});

// Explicitly handle the action (toolbar icon) click to ensure the panel opens.
Browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
        await Browser.sidePanel.open({ tabId: tab.id });
    }
});

