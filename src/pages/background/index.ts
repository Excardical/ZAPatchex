import Browser from 'webextension-polyfill';

console.log('ZAPatchex background script loaded.');

Browser.runtime.onInstalled.addListener(() => {
  console.log('ZAPatchex extension has been installed.');
});