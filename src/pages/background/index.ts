import Browser from 'webextension-polyfill';
import { checkSpiderStatus, checkAjaxSpiderStatus, checkActiveScanStatus } from '../../utils/zapApi';

console.log('ZAPatchex background script loaded.');

const ALARM_NAME = 'zap-scan-poller';

interface ActiveScanState {
  id: string;
  type: 'spider' | 'ajaxSpider' | 'active';
  host: string;
  apiKey: string;
  notified?: boolean;
  status?: string;
}

// Listen for changes in storage to start/stop polling
Browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.activeScan) {
    if (changes.activeScan.newValue) {
      // Scan started or updated, ensure alarm is running
      Browser.alarms.create(ALARM_NAME, { periodInMinutes: 0.1 }); // Check every 6 seconds
      // Clear any leftover badges from previous runs
      Browser.action.setBadgeText({ text: '' });
    } else {
      // Scan removed (completed or stopped by user in popup)
      Browser.alarms.clear(ALARM_NAME);
      // We also clear the badge here, assuming the user opened the popup to see the result
      Browser.action.setBadgeText({ text: '' });
    }
  }
});

// Poll status
Browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  try {
    const data = await Browser.storage.local.get('activeScan');
    if (!data.activeScan) {
      Browser.alarms.clear(ALARM_NAME);
      return;
    }

    const { id, type, host, apiKey, notified } = data.activeScan as ActiveScanState;

    // If we already notified for this specific scan session, don't spam
    if (notified) return;

    let progress = 0;

    if (type === 'spider') {
      progress = await checkSpiderStatus(host, apiKey, id);
    } else if (type === 'active') {
      progress = await checkActiveScanStatus(host, apiKey, id);
    } else if (type === 'ajaxSpider') {
      const status = await checkAjaxSpiderStatus(host, apiKey);
      progress = status === 'stopped' ? 100 : 50;
    }

    if (progress >= 100) {
      // 1. Send Notification
      Browser.notifications.create({
        type: 'basic',
        iconUrl: 'Icons/icon-128.png',
        title: 'ZAPatchex Scan Complete',
        message: `The ${type} scan is complete.`
      });

      // 2. Set Green Dot Badge
      Browser.action.setBadgeText({ text: '●' });
      Browser.action.setBadgeBackgroundColor({ color: '#00FF00' }); // Green

      // 3. Mark as notified so we don't spam notifications if the user doesn't open it immediately
      await Browser.storage.local.set({
        activeScan: { ...data.activeScan, notified: true }
      });

      // Stop the alarm
      Browser.alarms.clear(ALARM_NAME);
    }

  } catch (error) {
    console.error('Background polling error:', error);
  }
});

Browser.runtime.onInstalled.addListener(() => {
  console.log('ZAPatchex extension has been installed.');
});