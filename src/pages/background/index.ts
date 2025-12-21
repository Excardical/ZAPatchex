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

// Local cache to track scan state efficiently, even if storage is cleared quickly
let currentScan: ActiveScanState | null = null;

/**
 * Polls the current scan status.
 * Can be called by the Alarm or immediately upon storage changes.
 */
const pollScanStatus = async () => {
  // If local cache is empty (e.g., Service Worker woke up), try to hydrate from storage
  if (!currentScan) {
    const data = await Browser.storage.local.get('activeScan');
    if (data.activeScan) {
      currentScan = data.activeScan as ActiveScanState;
    } else {
      // No scan to track
      Browser.alarms.clear(ALARM_NAME);
      return;
    }
  }

  const { id, type, host, apiKey, notified } = currentScan;

  // If already notified, stop polling
  if (notified) {
    Browser.alarms.clear(ALARM_NAME);
    return;
  }

  try {
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
      // Update local cache to prevent duplicate notifications
      currentScan.notified = true;

      // 1. Send Notification
      await Browser.notifications.create({
        type: 'basic',
        iconUrl: 'Icons/icon-128.png',
        title: 'ZAPatchex Scan Complete',
        message: `The ${type} scan is complete.`
      });

      // 2. Set Green Dot Badge
      Browser.action.setBadgeText({ text: '●' });
      Browser.action.setBadgeBackgroundColor({ color: '#00FF00' }); // Green

      // 3. Persist 'notified' state to storage (if the entry still exists)
      // This prevents the popup from thinking it's un-notified if it re-reads storage
      const currentStorage = await Browser.storage.local.get('activeScan');
      const storedScan = currentStorage.activeScan as ActiveScanState | undefined;

      if (storedScan && storedScan.id === id) {
        await Browser.storage.local.set({
          activeScan: { ...storedScan, notified: true }
        });
      }

      // Stop the alarm
      Browser.alarms.clear(ALARM_NAME);
    }

  } catch (error) {
    console.error('Background polling error:', error);
  }
};

// Listen for changes in storage to start/stop polling
Browser.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.activeScan) {
    const newValue = changes.activeScan.newValue as ActiveScanState | undefined;
    const oldValue = changes.activeScan.oldValue as ActiveScanState | undefined;

    if (newValue) {
      // Update local cache
      currentScan = newValue;

      // Check if this is a NEW scan or just an update to an existing one
      const isNewScan = !oldValue || oldValue.id !== newValue.id;

      if (isNewScan) {
        // 1. Start polling IMMEDIATELY to catch short scans (1-2s)
        pollScanStatus();

        // 2. Create the alarm for subsequent checks
        // We only create it on a new scan to avoid resetting the timer on every progress update
        Browser.alarms.create(ALARM_NAME, { periodInMinutes: 0.1 }); // Check every 6 seconds

        // Clear badge for new scan
        Browser.action.setBadgeText({ text: '' });
      }
      // If it's just an update (isNewScan === false), we do NOTHING.
      // This allows the existing alarm to continue firing without being reset.

    } else {
      // Scan removed from storage (completed or stopped by user)

      // If we were tracking a scan, it might have finished and the Popup cleared it.
      // We must perform a FINAL check to ensure we send the notification if it succeeded.
      let scanToFinalize = currentScan;

      // If local cache is empty (SW restart), try to use the oldValue from the change event
      if (!scanToFinalize && oldValue) {
        scanToFinalize = oldValue;
        currentScan = scanToFinalize; // Set cache for the poll function
      }

      if (scanToFinalize && !scanToFinalize.notified) {
        await pollScanStatus();
      }

      // Cleanup
      currentScan = null;
      Browser.alarms.clear(ALARM_NAME);
      // We don't clear the badge here immediately so the user can see the Green Dot result
      // if they haven't acknowledged the notification yet.
    }
  }
});

// Poll status on Alarm trigger
Browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    pollScanStatus();
  }
});

Browser.runtime.onInstalled.addListener(() => {
  console.log('ZAPatchex extension has been installed.');
});