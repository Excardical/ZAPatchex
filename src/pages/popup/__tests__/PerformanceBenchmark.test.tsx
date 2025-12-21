import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import fs from 'fs-extra';
import path from 'path';
import { VulnerabilityPanel, findTemplateMatch, GroupedAlert } from '../VulnerabilityPanel';

// ------------------------------------------------------------------
// 🔧 CONFIGURATION
// ------------------------------------------------------------------
const ZAP_HOST = 'http://localhost:8080';
const ZAP_API_KEY = 'cf5f0kplqcvdqkau3g7q8fgllp'; // <--- PASTE KEY HERE
const REPORT_FILE = path.resolve(process.cwd(), 'performance_report.md');
// ------------------------------------------------------------------

// Mock Chrome & Window
global.chrome = { runtime: { getURL: (p: string) => p } } as any;
window.scrollTo = vi.fn();

// Data Store for the Final Report Row
const benchmarkResults = {
    timestamp: '',
    totalAlerts: 0,
    uniqueAlerts: 0,
    jsonSizeMB: '0',
    templateMatchTotalMs: '0',
    templateMatchAvgMs: '0',
    uiMountMs: '0',
    uiHeavyRenderMs: '0'
};

// Helper to console log
function log(message: string) {
    console.log(message);
}

async function fetchZapAlerts() {
    try {
        const checkUrl = `${ZAP_HOST}/JSON/core/view/version/?apikey=${ZAP_API_KEY}`;
        const checkRes = await fetch(checkUrl);
        if (!checkRes.ok) throw new Error("Connection Refused");

        const apiUrl = `${ZAP_HOST}/JSON/alert/view/alerts/?apikey=${ZAP_API_KEY}&baseurl=&start=0&count=0`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data.alerts || [];
    } catch (e) {
        throw new Error(`❌ CONNECTION FAILED: Is ZAP running on port 8080? Error: ${(e as Error).message}`);
    }
}

function loadTemplatesFromDisk() {
    const templatePath = path.resolve(process.cwd(), 'public/vulnerability_templates.json');
    return fs.readJSONSync(templatePath);
}

describe('ZAPatchex Performance Benchmark', () => {
    let rawAlerts: any[] = [];
    let groupedAlerts: GroupedAlert[] = [];
    let templates: any[] = [];

    // 1. PREPARE DATA - INCREASED TIMEOUT TO 240 SECONDS (4 MINUTES)
    beforeAll(async () => {
        benchmarkResults.timestamp = new Date().toLocaleString();
        log('🔵 --- STARTING BENCHMARK ---');

        try {
            const fetchStart = performance.now();
            rawAlerts = await fetchZapAlerts();
            const fetchEnd = performance.now();
            log(`📡 Data Fetch Time: ${(fetchEnd - fetchStart).toFixed(2)}ms`);
        } catch (e) {
            log((e as Error).message);
            throw e;
        }

        if (rawAlerts.length === 0) {
            throw new Error("⚠️ NO ALERTS FOUND: The session appears empty. Please load a ZAP session with data.");
        }

        // Load Templates
        templates = loadTemplatesFromDisk();

        // Group Alerts
        const groups = new Map<string, GroupedAlert>();
        rawAlerts.forEach((alert) => {
            if (!groups.has(alert.name)) {
                groups.set(alert.name, { ...alert, instances: [] });
            }
            groups.get(alert.name)?.instances.push({
                url: alert.url,
                param: alert.param,
                evidence: alert.evidence
            });
        });
        groupedAlerts = Array.from(groups.values());
    }, 900000); // <--- TIMEOUT INCREASED HERE

    // 2. MEASURE WEIGHT
    it('Should record Session Weight', () => {
        benchmarkResults.totalAlerts = rawAlerts.length;
        benchmarkResults.uniqueAlerts = groupedAlerts.length;

        const jsonString = JSON.stringify(rawAlerts);
        benchmarkResults.jsonSizeMB = (jsonString.length / (1024 * 1024)).toFixed(4);

        log(`📊 Session Weight: ${benchmarkResults.jsonSizeMB} MB with ${benchmarkResults.totalAlerts} alerts.`);
        expect(benchmarkResults.totalAlerts).toBeGreaterThan(0);
    });

    // 3. MEASURE LOGIC TIMING
    it('Should benchmark Template Matching logic', () => {
        const start = performance.now();
        let matchesFound = 0;
        groupedAlerts.forEach(alert => {
            const match = findTemplateMatch(alert, templates);
            if (match.matchType !== 'none') matchesFound++;
        });
        const end = performance.now();
        const duration = end - start;

        benchmarkResults.templateMatchTotalMs = duration.toFixed(4);
        benchmarkResults.templateMatchAvgMs = (duration / groupedAlerts.length).toFixed(4);

        log(`🧠 Logic Time: ${benchmarkResults.templateMatchTotalMs}ms (Avg: ${benchmarkResults.templateMatchAvgMs}ms)`);
    });

    // 4. MEASURE UI TIMING
    it('Should benchmark UI Rendering', () => {
        // Mock internal fetches
        global.fetch = vi.fn((url: any) => {
            const u = url.toString();
            if (u.includes('vulnerability_templates')) return Promise.resolve({ json: () => Promise.resolve(templates) });
            if (u.includes('view/sites')) return Promise.resolve({ json: () => Promise.resolve({ sites: ['http://test.com'] }) });
            return Promise.resolve({ json: () => Promise.resolve({}) });
        }) as any;

        // Test Mount
        const mountStart = performance.now();
        const { unmount } = render(
            <VulnerabilityPanel
                alerts={groupedAlerts}
                host={ZAP_HOST}
                apiKey={ZAP_API_KEY}
                onViewDashboard={() => { }}
                onSiteSelect={() => { }}
                selectedSite=""
            />
        );
        const mountEnd = performance.now();
        benchmarkResults.uiMountMs = (mountEnd - mountStart).toFixed(4);
        unmount();

        // Test Heavy Render
        const heaviestAlert = groupedAlerts.reduce((p, c) => (p.instances.length > c.instances.length) ? p : c);

        log(`   ➤ Stressing UI with heaviest alert: ${heaviestAlert.instances.length} URLs`);

        const modalStart = performance.now();
        render(
            <VulnerabilityPanel
                alerts={[heaviestAlert]}
                host={ZAP_HOST}
                apiKey={ZAP_API_KEY}
                onViewDashboard={() => { }}
                onSiteSelect={() => { }}
                selectedSite=""
            />
        );
        const modalEnd = performance.now();
        benchmarkResults.uiHeavyRenderMs = (modalEnd - modalStart).toFixed(4);

        log(`🎨 UI Time: Mount ${benchmarkResults.uiMountMs}ms | Heavy Render ${benchmarkResults.uiHeavyRenderMs}ms`);
    });

    // 5. WRITE TO TABLE
    afterAll(() => {
        const headers = `| Timestamp | Total Alerts | Unique Vulns | Payload (MB) | Template Match (Total ms) | Template Match (Avg ms) | UI Mount (ms) | UI Heavy Render (ms) |\n|---|---|---|---|---|---|---|---|\n`;

        const row = `| ${benchmarkResults.timestamp} | ${benchmarkResults.totalAlerts} | ${benchmarkResults.uniqueAlerts} | ${benchmarkResults.jsonSizeMB} | ${benchmarkResults.templateMatchTotalMs} | ${benchmarkResults.templateMatchAvgMs} | ${benchmarkResults.uiMountMs} | ${benchmarkResults.uiHeavyRenderMs} |\n`;

        if (!fs.existsSync(REPORT_FILE)) {
            fs.writeFileSync(REPORT_FILE, headers);
        }

        fs.appendFileSync(REPORT_FILE, row);
        log(`✅ Record appended to: ${REPORT_FILE}`);
    });
});