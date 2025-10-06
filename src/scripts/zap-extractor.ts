import clipboardy from 'clipboardy';
import readline from 'readline';

// --- Configuration ---
const ZAP_HOST = 'http://localhost:8080';

// --- Helper for User Input ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

// --- Main Script Logic ---
async function runOnce(zapApiKey: string) {
  console.log("📡 Fetching alerts from ZAP...");
  const apiUrl = new URL(`${ZAP_HOST}/JSON/alert/view/alerts/`);
  apiUrl.searchParams.append('baseurl', '');
  apiUrl.searchParams.append('start', '0');
  apiUrl.searchParams.append('count', '0');

  try {
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: { 'X-ZAP-API-Key': zapApiKey },
    });

    if (!response.ok) {
      throw new Error(`API request failed. Status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { alerts: any[] };
    const alerts = data.alerts;

    if (!alerts || alerts.length === 0) {
      console.warn("🟡 No alerts found in the current ZAP session.");
      return;
    }

    // Group alerts
    const groupedAlerts = new Map<string, any>();
    alerts.forEach(alert => {
      if (!groupedAlerts.has(alert.name)) {
        groupedAlerts.set(alert.name, { ...alert, instances: [] });
      }
      groupedAlerts.get(alert.name)!.instances.push(alert);
    });

    const uniqueAlerts = Array.from(groupedAlerts.values());

    console.log("\n✅ Found the following unique vulnerabilities:");
    uniqueAlerts.forEach((alert, index) => {
      console.log(`[${index}] - ${alert.name} (${alert.risk})`);
    });

    const choiceStr = await askQuestion("\nEnter the number of the vulnerability to process (or 'q' to quit): ");
    if (choiceStr.toLowerCase() === 'q') {
      return 'quit';
    }

    const choice = parseInt(choiceStr, 10);
    if (isNaN(choice) || choice < 0 || choice >= uniqueAlerts.length) {
      console.error("❌ Invalid selection.");
      return;
    }

    const selectedAlert = uniqueAlerts[choice];

    let promptText = `
Based on the following ZAP alert data:

- **Name**: ${selectedAlert.name}
- **Risk**: ${selectedAlert.risk}
- **Confidence**: ${selectedAlert.confidence}
- **CWE ID**: ${selectedAlert.cweid || 'N/A'}
- **WASC ID**: ${selectedAlert.wascid || 'N/A'}
- **Description**: ${selectedAlert.description}
- **Solution**: ${selectedAlert.solution}
- **Instances**:
`;

    selectedAlert.instances.forEach((instance: any) => {
      promptText += `
  - **URL**: ${instance.url}
    **Parameter**: ${instance.param || 'N/A'}
    **Evidence**: ${instance.evidence || 'N/A'}
`;
    });

    await clipboardy.write(promptText.trim());
    console.log("\n✅ Successfully copied the formatted alert to your clipboard!");
    console.log("\n--- Start of Prompt Text ---");
    console.log(promptText.trim());
    console.log("--- End of Prompt Text ---\n");

  } catch (error) {
    console.error("\n❌ An error occurred:", (error as Error).message);
  }
}

async function main() {
  const zapApiKey = await askQuestion("🔑 Please enter your ZAP API Key: ");
  if (!zapApiKey) {
    console.error("❌ API Key is required. Script stopped.");
    rl.close();
    return;
  }

  while (true) {
    const result = await runOnce(zapApiKey);
    if (result === 'quit') {
      console.log("👋 Exiting...");
      rl.close();
      break;
    }
  }
}

main();
