import { describe, it, expect } from 'vitest';
import { findTemplateMatch, GroupedAlert } from '../VulnerabilityPanel';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
const ZAP_HOST = 'http://localhost:8080';
const ZAP_API_KEY = 'cf5f0kplqcvdqkau3g7q8fgllp'; // <--- VERIFY THIS
const OUTPUT_FILE = path.resolve(__dirname, '../../../../benchmark_results.md');

// Define the "Stress Levels"
const STRESS_LEVELS = [
    { label: 'Real Load (Baseline)', multiplier: 1 },
    { label: 'Synthetic Medium (20x)', multiplier: 20 },
    { label: 'Synthetic Medium (100x)', multiplier: 100 },
    { label: 'Synthetic Medium (200x)', multiplier: 200 },
    { label: 'Synthetic Heavy (300x)', multiplier: 300 },
    { label: 'Synthetic Heavy (500x)', multiplier: 500 },
    { label: 'Synthetic Extreme (1000x)', multiplier: 1000 },
    { label: 'Synthetic Extreme (2000x)', multiplier: 2000 },
];

describe('Performance Stability: Linear Scalability Test', () => {
    const templates = require('../../../../public/vulnerability_templates.json');

    it('proves stability by creating synthetic high loads', async () => {
        // 1. Fetch Real Data ONCE
        const apiUrl = new URL(`${ZAP_HOST}/JSON/alert/view/alerts/`);
        apiUrl.searchParams.append('baseurl', '');
        apiUrl.searchParams.append('start', '0');
        apiUrl.searchParams.append('count', '0');
        apiUrl.searchParams.append('apikey', ZAP_API_KEY);

        let baseAlerts: GroupedAlert[] = [];
        let baseRawCount = 0; // <--- NEW: Track raw count

        try {
            const response = await fetch(apiUrl.toString());
            const data = await response.json() as { alerts: any[] };

            if (!data.alerts || data.alerts.length === 0) {
                console.warn("⚠️ No alerts found. Please open a session with at least some alerts.");
                return;
            }

            // Capture Baseline Raw Count
            baseRawCount = data.alerts.length;

            // Group them (Optimization Logic)
            const alertMap = new Map<string, any>();
            data.alerts.forEach(alert => {
                if (!alertMap.has(alert.name)) {
                    alertMap.set(alert.name, { ...alert, instances: [] });
                }
                alertMap.get(alert.name)!.instances.push(alert);
            });
            baseAlerts = Array.from(alertMap.values());

            console.log(`\nBaseline: ${baseRawCount} Raw Alerts -> ${baseAlerts.length} Unique Groups`);

        } catch (e) {
            console.error("❌ ZAP Connection Failed", e);
            throw e;
        }

        // 2. Run the Stress Loop
        for (const level of STRESS_LEVELS) {
            // Create the synthetic load
            let syntheticLoad: GroupedAlert[] = [];
            for (let i = 0; i < level.multiplier; i++) {
                syntheticLoad = syntheticLoad.concat(baseAlerts);
            }

            // Calculate "Virtual" Raw Count
            const totalRawAlerts = baseRawCount * level.multiplier;

            // Start Timer
            const startTime = performance.now();

            // Run Engine
            syntheticLoad.forEach(alert => {
                findTemplateMatch(alert, templates);
            });

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const avgTime = totalTime / syntheticLoad.length;

            // 3. Export Results with Raw Count
            const timestamp = new Date().toLocaleTimeString();

            // Write Header if new file
            if (!fs.existsSync(OUTPUT_FILE)) {
                fs.writeFileSync(OUTPUT_FILE, `| Timestamp | Load Type | Raw Alerts (Virtual) | Unique Groups | Processing Time (ms) | Avg Time/Group (ms) |\n|---|---|---|---|---|---|\n`);
            }

            const row = `| ${timestamp} | ${level.label} | ${totalRawAlerts} | ${syntheticLoad.length} | ${totalTime.toFixed(4)} | ${avgTime.toFixed(4)} |\n`;
            fs.appendFileSync(OUTPUT_FILE, row);

            console.log(`✅ ${level.label}: ${totalRawAlerts} Raw Alerts processed in ${totalTime.toFixed(2)}ms`);

            // 4. STABILITY ASSERTION
            expect(avgTime).toBeLessThan(10.0);
        }
    }, 300000);
});