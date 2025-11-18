# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZAPatchex is a browser extension that serves as a ZAP (OWASP Zed Attack Proxy) authentication helper and vulnerability scanner interface. It provides a user-friendly interface for connecting to ZAP, performing security scans, and analyzing vulnerability results directly from the browser.

## Common Development Commands

### Building the Extension
```bash
# Build for Chrome (production)
npm run build
npm run build:chrome

# Build for Firefox (production)
npm run build:firefox

# Development build with hot reload
npm run dev
npm run dev:chrome
npm run dev:firefox
```

### ZAP Integration Tools
```bash
# Extract vulnerability data from ZAP (interactive CLI tool)
npm run extract-zap
```

### Package Management
```bash
# Install dependencies
npm install

# Type checking (no explicit script - use IDE or tsc directly)
npx tsc --noEmit
```

## Architecture Overview

### Extension Structure
- **Manifest V3** Chrome extension with Firefox support
- **Vite + React + TypeScript** build system with Tailwind CSS
- **Background Service Worker** handles extension lifecycle
- **Content Scripts** for web page interaction
- **Popup UI** main interface for ZAP connectivity and scanning
- **DevTools Panel** for enhanced security analysis

### Key Components

#### Popup Interface (`src/pages/popup/`)
- **Popup.tsx**: Main connection interface with ZAP host/API key configuration
- **ZapScannerPanel.tsx**: Scan configuration and execution
- **ActionsPanel.tsx**: Post-scan vulnerability analysis
- **VulnerabilityPanel.tsx**: Detailed vulnerability display
- **CodeSolutionPanel.tsx**: Code remediation suggestions

#### Background Script (`src/pages/background/index.ts`)
- Minimal background service worker for extension lifecycle management

#### ZAP Integration (`src/scripts/zap-extractor.ts`)
- Standalone CLI tool for extracting vulnerability data from ZAP API
- Interactive vulnerability selection and clipboard copying functionality

### Build Configuration
- **Base Config** (`vite.config.base.ts`): Shared Vite configuration with React, Tailwind, and path aliases
- **Chrome Config** (`vite.config.chrome.ts`): Chrome-specific build with CRX plugin
- **Firefox Config** (`vite.config.firefox.ts`): Firefox-specific build settings
- **Development**: Uses nodemon for file watching and automatic rebuilding

### Path Aliases
```typescript
"@src/*": ["src/*"]
"@assets/*": ["src/assets/*"]
"@locales/*": ["src/locales/*"]
"@pages/*": ["src/pages/*"]
```

## ZAP API Integration

The extension connects to ZAP via REST API:
- Default endpoint: `http://localhost:8080`
- Authentication via X-ZAP-API-Key header
- Core endpoints used:
  - `/JSON/core/view/version/` - Connection testing
  - `/JSON/alert/view/alerts/` - Vulnerability data retrieval
  - `/JSON/ascan/action/scan/` - Active scanning
  - `/JSON/spider/action/scan/` - Web crawling

## Key Features

1. **Connection Management**: Secure ZAP connection with API key storage
2. **Vulnerability Scanning**: Active scan and spider capabilities
3. **Results Analysis**: Vulnerability categorization and detailed reporting
4. **Code Solutions**: Automated remediation suggestions
5. **Data Export**: Clipboard integration for vulnerability data

## Development Notes

- Extension supports both Chrome and Firefox with manifest variations
- Uses webextension-polyfill for cross-browser compatibility
- Storage API used for persisting ZAP connection settings
- Tailwind CSS for styling with custom utility classes
- TypeScript strict mode enabled with comprehensive type checking
- New Target Schema: {
    "pluginId": 10003,
    "title": "Vulnerable JS Library",
    "defaultRisk": "Medium",
    "cweid": null,
    "description": "The identified library appears to be vulnerable.",
    "simplified_description": "Your website is using outdated versions of JavaScript libraries (Bootstrap 3.0.2 and jQuery 3.4.1) that contain known security vulnerabilities. This is like using old locks on your doors that burglars know how to pick. Attackers can exploit these weaknesses to inject malicious code, steal user data, or compromise your website. These specific versions have documented security flaws that hackers actively target.",
    "solution": "Upgrade to the latest version of the affected library.",
    "simplified_solution": "Update Bootstrap and jQuery to their latest stable versions to eliminate known security vulnerabilities and ensure your application is protected against documented exploits.",
    "references": [
      {
        "name": "OWASP Top Ten",
        "url": "https://owasp.org/www-project-top-ten/"
      },
      {
        "name": "MITRE ATT&CK Framework",
        "url": "https://attack.mitre.org/"
      }
    ],
    "code_solution_samples": [
      {
        "type": "Default Implementation",
        "solution_description": "This solution demonstrates how to upgrade the vulnerable JavaScript libraries to their latest secure versions. Bootstrap 3.0.2 (released 2013) contains multiple XSS vulnerabilities and should be upgraded to Bootstrap 5.3.x or later. jQuery 3.4.1 (released 2019) has prototype pollution vulnerabilities (CVE-2019-11358, CVE-2020-11022, CVE-2020-11023) and should be upgraded to jQuery 3.7.x or later. The code shows proper implementation using CDN links with Subresource Integrity (SRI) hashes for security, along with fallback mechanisms and proper placement in HTML. It also includes package.json configuration for projects using npm/yarn, and verification steps to ensure successful migration.",
        "affected_files": "HTML template files, layout/master page files (index.html, base.html, layout.ejs, header.pug), static asset directories (/static/js/, /public/js/, /assets/js/), package.json or bower.json for dependency management, build configuration files (webpack.config.js, gulpfile.js), and any JavaScript files that reference or import these libraries",
        "code": "<!-- HTML - Upgrade Vulnerable JavaScript Libraries -->\n\n<!-- BEFORE (VULNERABLE): -->\n<!-- <script src=\"/static/js/jquery-3.4.1.min.js\"></script> -->\n<!-- <script src=\"/static/js/bootstrap.js\"></script> -->\n\n<!-- AFTER (SECURE): Update to latest stable versions -->\n\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Secure Application</title>\n    \n    <!-- Bootstrap 5.3.3 CSS (Latest stable as of 2024) -->\n    <!-- Upgrade from Bootstrap 3.0.2 to 5.3.3+ -->\n    <link \n        href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css\" \n        rel=\"stylesheet\" \n        integrity=\"sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH\" \n        crossorigin=\"anonymous\">\n</head>\n<body>\n    <!-- Your content here -->\n    \n    <!-- JavaScript libraries at end of body for performance -->\n    \n    <!-- jQuery 3.7.1 (Latest stable version) -->\n    <!-- Upgrade from jQuery 3.4.1 to 3.7.1+ -->\n    <!-- Fixes CVE-2019-11358, CVE-2020-11022, CVE-2020-11023 -->\n    <script \n        src=\"https://code.jquery.com/jquery-3.7.1.min.js\" \n        integrity=\"sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs\" \n        crossorigin=\"anonymous\"></script>\n    \n    <!-- Fallback to local copy if CDN fails -->\n    <script>\n        if (typeof jQuery === 'undefined') {\n            document.write('<script src=\"/static/js/jquery-3.7.1.min.js\"><\\/script>');\n        }\n    </script>\n    \n    <!-- Bootstrap 5.3.3 JS Bundle (includes Popper.js) -->\n    <!-- Bootstrap 5 has breaking changes from v3 - migration required -->\n    <script \n        src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js\" \n        integrity=\"sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz\" \n        crossorigin=\"anonymous\"></script>\n    \n    <!-- Fallback for Bootstrap -->\n    <script>\n        if (typeof bootstrap === 'undefined') {\n            document.write('<script src=\"/static/js/bootstrap.bundle.min.js\"><\\/script>');\n        }\n    </script>\n</body>\n</html>\n\n<!-- ============================================ -->\n<!-- PACKAGE.JSON CONFIGURATION (for npm projects) -->\n<!-- ============================================ -->\n\n/*\n{\n  \"name\": \"secure-web-app\",\n  \"version\": \"1.0.0\",\n  \"description\": \"Web application with updated dependencies\",\n  \"dependencies\": {\n    \"jquery\": \"^3.7.1\",\n    \"bootstrap\": \"^5.3.3\",\n    \"popper.js\": \"^2.11.8\"\n  },\n  \"scripts\": {\n    \"audit\": \"npm audit\",\n    \"audit-fix\": \"npm audit fix\",\n    \"update-deps\": \"npm update\",\n    \"check-updates\": \"npx npm-check-updates\"\n  }\n}\n*/\n\n<!-- ============================================ -->\n<!-- SELF-HOSTING LIBRARIES (Recommended for production) -->\n<!-- ============================================ -->\n\n<!-- Step 1: Download latest versions -->\n<!-- \n  jQuery: https://jquery.com/download/\n  Bootstrap: https://getbootstrap.com/docs/5.3/getting-started/download/\n-->\n\n<!-- Step 2: Place in /static/js/ directory -->\n<!-- Step 3: Update HTML references -->\n\n<!--\n<script src=\"/static/js/jquery-3.7.1.min.js\"></script>\n<script src=\"/static/js/bootstrap.bundle.min.js\"></script>\n-->\n\n<!-- ============================================ -->\n<!-- MIGRATION NOTES: Bootstrap 3 to Bootstrap 5 -->\n<!-- ============================================ -->\n\n/*\nBootstrap 5 Breaking Changes (Major updates required):\n\n1. jQuery is NO LONGER REQUIRED for Bootstrap 5\n   - Bootstrap 5 uses vanilla JavaScript\n   - Keep jQuery only if your custom code depends on it\n\n2. Class name changes:\n   - .pull-left → .float-start\n   - .pull-right → .float-end\n   - .hidden → .d-none\n   - .show → .d-block\n   - .ml-* → .ms-* (margin-left → margin-start)\n   - .mr-* → .me-* (margin-right → margin-end)\n   - .pl-* → .ps-* (padding-left → padding-start)\n   - .pr-* → .pe-* (padding-right → padding-end)\n\n3. Form controls:\n   - .form-control-* sizing classes changed\n   - .custom-select → .form-select\n   - .custom-file → removed (use .form-control with type=\"file\")\n\n4. JavaScript API changes:\n   - Data attributes: data-toggle → data-bs-toggle\n   - Events: 'hidden.bs.modal' instead of 'hidden'\n   - Modal: $('#myModal').modal('show') → new bootstrap.Modal(myModal).show()\n\n5. Removed components:\n   - Wells, panels, thumbnails removed\n   - Use cards instead\n\n6. Glyph icons removed:\n   - Use Bootstrap Icons, Font Awesome, or other icon libraries\n\nRefer to official migration guide:\nhttps://getbootstrap.com/docs/5.3/migration/\n*/\n\n<!-- ============================================ -->\n<!-- SECURITY VERIFICATION CHECKLIST -->\n<!-- ============================================ -->\n\n/*\nPost-Update Verification Steps:\n\n1. Check library versions:\n   - Open browser DevTools → Console\n   - Run: jQuery.fn.jquery (should show 3.7.1+)\n   - Run: bootstrap.Tooltip.VERSION (should show 5.3.3+)\n\n2. Verify SRI hashes:\n   - Generate new hashes: https://www.srihash.org/\n   - Or use: curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A\n\n3. Test functionality:\n   - Test all interactive components (modals, dropdowns, tooltips)\n   - Verify responsive behavior\n   - Check console for JavaScript errors\n\n4. Run security audit:\n   - npm audit (for npm projects)\n   - Check https://snyk.io/vuln/ for known vulnerabilities\n   - Use OWASP ZAP or similar tools to rescan\n\n5. Update documentation:\n   - Document library versions in README.md\n   - Update deployment scripts\n   - Inform team of breaking changes\n*/\n\n<!-- ============================================ -->\n<!-- AUTOMATED DEPENDENCY MANAGEMENT -->\n<!-- ============================================ -->\n\n/*\nNode.js/npm - Automated Updates and Monitoring:\n\n1. Install dependency checking tools:\n   npm install -g npm-check-updates\n   npm install -g snyk\n\n2. Check for updates:\n   npx npm-check-updates\n   npx npm-check-updates -u  # Update package.json\n\n3. Security scanning:\n   npm audit\n   npm audit fix\n   npm audit fix --force  # For breaking changes\n   \n   # Or use Snyk:\n   snyk test\n   snyk monitor\n\n4. Automated CI/CD security checks (GitHub Actions example):\n*/\n\n# .github/workflows/security-scan.yml\n# name: Security Audit\n# on: [push, pull_request]\n# jobs:\n#   security:\n#     runs-on: ubuntu-latest\n#     steps:\n#       - uses: actions/checkout@v3\n#       - uses: actions/setup-node@v3\n#         with:\n#           node-version: '18'\n#       - run: npm ci\n#       - run: npm audit --production\n#       - run: npx snyk test --severity-threshold=high\n\n<!-- ============================================ -->\n<!-- KNOWN VULNERABILITIES FIXED -->\n<!-- ============================================ -->\n\n/*\njQuery 3.4.1 → 3.7.1 fixes:\n- CVE-2019-11358: Prototype pollution vulnerability\n- CVE-2020-11022: XSS vulnerability in htmlPrefilter\n- CVE-2020-11023: XSS vulnerability in selector logic\n\nBootstrap 3.0.2 → 5.3.3 fixes:\n- CVE-2016-10735: XSS in data-target attribute\n- CVE-2018-14040: XSS in collapse data-parent attribute\n- CVE-2018-14041: XSS in tooltip and popover data-template\n- CVE-2018-14042: XSS in sanitizer bypass\n- CVE-2019-8331: XSS in tooltip/popover with sanitizer\n- Multiple other XSS vulnerabilities in versions 3.x-4.x\n*/\n\n<!-- ============================================ -->\n<!-- MAINTENANCE BEST PRACTICES -->\n<!-- ============================================ -->\n\n/*\n1. Regular updates:\n   - Review dependencies quarterly minimum\n   - Subscribe to security advisories (GitHub Security Alerts)\n   - Monitor CVE databases for your stack\n\n2. Version pinning:\n   - Use exact versions in production: \"jquery\": \"3.7.1\"\n   - Use caret for development: \"jquery\": \"^3.7.1\"\n   - Lock file: commit package-lock.json\n\n3. Testing strategy:\n   - Maintain comprehensive test suite\n   - Test after every dependency update\n   - Use staging environment for validation\n\n4. Rollback plan:\n   - Keep previous working versions\n   - Document rollback procedures\n   - Use version control tags\n\n5. Security monitoring:\n   - Enable Dependabot/Renovate for automated PRs\n   - Set up Snyk or similar continuous monitoring\n   - Subscribe to library security mailing lists\n*/\n\n<!-- ============================================ -->\n<!-- IMMEDIATE ACTION ITEMS -->\n<!-- ============================================ -->\n\n/*\nCRITICAL - DO IMMEDIATELY:\n\n1. Update jQuery from 3.4.1 to 3.7.1 or later\n2. Update Bootstrap from 3.0.2 to 5.3.3 or later\n3. Test all functionality after updates\n4. Deploy to production after thorough testing\n5. Set up automated dependency monitoring\n\nTIMELINE:\n- Day 1: Update in development environment\n- Day 2-3: Thorough testing and bug fixes\n- Day 4: Deploy to staging\n- Day 5: Production deployment\n- Ongoing: Monitor for new vulnerabilities\n*/"
      }