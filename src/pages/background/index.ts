import Browser from 'webextension-polyfill';
import { checkSpiderStatus, checkAjaxSpiderStatus, checkActiveScanStatus, fetchAllAlerts } from '../../utils/zapApi';

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

let currentScan: ActiveScanState | null = null;

const pollScanStatus = async () => {
  if (!currentScan) {
    const data = await Browser.storage.local.get('activeScan');
    if (data.activeScan) {
      currentScan = data.activeScan as ActiveScanState;
    } else {
      Browser.alarms.clear(ALARM_NAME);
      return;
    }
  }

  const { id, type, host, apiKey, notified } = currentScan;

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
      currentScan.notified = true;

      // --- NEW: Background Fetch & Cache ---
      // We fetch the results immediately so they are ready when the user opens the popup.
      try {
        console.log("Scan complete. Background fetching alerts...");
        const alerts = await fetchAllAlerts(host, apiKey);
        await Browser.storage.local.set({
          zap_cached_alerts: alerts,
          zap_cache_timestamp: Date.now()
        });
        console.log(`Cached ${alerts.length} grouped alerts.`);
      } catch (cacheErr) {
        console.error("Background fetch failed:", cacheErr);
      }
      // -------------------------------------

      // 1. Send Notification
      await Browser.notifications.create({
        type: 'basic',
        iconUrl: 'Icons/icon-128.png',
        title: 'ZAPatchex Scan Complete',
        message: `The ${type} scan is complete.`
      });

      // 2. Update Storage
      const currentStorage = await Browser.storage.local.get('activeScan');
      const storedScan = currentStorage.activeScan as ActiveScanState | undefined;

      if (storedScan && storedScan.id === id) {
        await Browser.storage.local.set({
          activeScan: { ...storedScan, notified: true }
        });
      }

      Browser.alarms.clear(ALARM_NAME);
    }

  } catch (error) {
    console.error('Background polling error:', error);
  }
};

Browser.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.activeScan) {
    const newValue = changes.activeScan.newValue as ActiveScanState | undefined;
    const oldValue = changes.activeScan.oldValue as ActiveScanState | undefined;

    if (newValue) {
      currentScan = newValue;
      const isNewScan = !oldValue || oldValue.id !== newValue.id;
      if (isNewScan) {
        pollScanStatus();
        Browser.alarms.create(ALARM_NAME, { periodInMinutes: 0.1 });
        // Removed badge clearing here as per previous request
      }
    } else {
      let scanToFinalize = currentScan || oldValue;
      if (scanToFinalize && !scanToFinalize.notified) {
        await pollScanStatus();
      }
      currentScan = null;
      Browser.alarms.clear(ALARM_NAME);
    }
  }
});

Browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    pollScanStatus();
  }
});

Browser.runtime.onInstalled.addListener(() => {
  console.log('ZAPatchex extension has been installed.');
});