ZAPatchex
=========

<div align="center">
<img src="public/Icons/ZAPATCHEX_ICO.png" alt="ZAPatchex Logo" width="128"/>

<h3>The Modern Browser Interface for OWASP ZAP</h3>

<p>
  <b>ZAPATCHEX</b> is a Chrome & Firefox extension that acts as a modern remote control for OWASP ZAP. 
  Run scans, manage sessions, and view vulnerability reports directly from your browser toolbar without switching windows.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/Vite-7-purple?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss" alt="Tailwind">
</p>

</div>

Features
--------

* **Seamless Connection**: Connects instantly to your local or remote ZAP instance via API Key.
* **Scan Control**:
    * **Standard Mode**: Runs the traditional Spider to map applications.
    * **Attack Mode**: Launches the Active Scanner to find vulnerabilities.
    * **AJAX Spider**: Optional support for modern JavaScript-heavy applications.
* **Real-time Monitoring**: View scan progress bars and status updates directly in the popup.
* **Vulnerability Reporting**:
    * Browse alerts filtered by site.
    * View detailed risk analysis (High/Medium/Low), confidence levels, and evidence.
    * **Code Solutions**: Get templated code fixes tailored to the specific vulnerability and language (PHP, Java, JS, etc.).
* **Session Management**: Save snapshots, create new sessions, or shutdown ZAP from the extension.
* **Dark Mode UI**: A clean, developer-friendly interface built with Tailwind CSS.

Prerequisites
-------------

1.  **Node.js** (v18+) & **Yarn** installed.
2.  **OWASP ZAP** (v2.12+) installed and running.
    * *Note: Ensure ZAP is configured to accept API calls (default: `localhost:8080`).*

Installation & Build
--------------------

### 1. Clone & Install Dependencies
```bash
git clone [https://github.com/yourusername/ZAPatchex.git](https://github.com/yourusername/ZAPatchex.git)
cd ZAPatchex
yarn install
````

### 2\. Build the Extension

You can build for either Chrome or Firefox:

```bash
# For Google Chrome / Edge / Brave
yarn build:chrome

# For Firefox
yarn build:firefox
```

*The build output will be located in the `dist_chrome` or `dist_firefox` directory.*

### 3\. Load into Browser

#### Chrome / Edge / Brave:

1.  Go to `chrome://extensions/`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the `dist_chrome` folder generated in the previous step.

#### Firefox:

1.  Go to `about:debugging#/runtime/this-firefox`.
2.  Click **Load Temporary Add-on...**.
3.  Select the `manifest.json` file inside the `dist_firefox` folder.

## Usage Guide

### 1\. Connect to ZAP

1.  Start OWASP ZAP on your machine.
2.  Open the **ZAPatchex** extension from your browser toolbar.
3.  Enter your ZAP **Host** (e.g., `http://localhost:8080`) and **API Key** (found in ZAP Options \> API).
4.  Click **Connect**.

### 2\. Run a Scan

1.  Enter the **Target URL** you wish to scan (e.g., `http://localhost:3000`).
2.  Select a **Scan Mode**:
      * **Standard**: Maps the site structure (Safe).
      * **Attack**: Simulates attacks to find bugs (Active Scan).
3.  (Optional) Check **Use AJAX Spider** if the target is a Single Page Application (SPA).
4.  Click **Start Scan**.

### 3\. Analyze Results

1.  Once the scan finishes, click **View Previous Reports**.
2.  Select the specific site from the dropdown to filter alerts.
3.  Click on an alert to view details.
4.  Use the **\<View Code Fix /\>** button to see suggested code remediations for that specific vulnerability.

## Development

Run the development server with hot-reload support:

```bash
# Chrome
yarn dev:chrome

# Firefox
yarn dev:firefox
```