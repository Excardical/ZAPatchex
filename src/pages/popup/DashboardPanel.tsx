// src/pages/popup/DashboardPanel.tsx
import React from 'react';
import { GroupedAlert } from './VulnerabilityPanel';

interface DashboardProps {
    alerts: GroupedAlert[];
    onViewList: () => void;
}

export const DashboardPanel: React.FC<DashboardProps> = ({ alerts, onViewList }) => {
    const riskCounts = {
        High: alerts.filter(a => a.risk === 'High').length,
        Medium: alerts.filter(a => a.risk === 'Medium').length,
        Low: alerts.filter(a => a.risk === 'Low').length,
        Informational: alerts.filter(a => a.risk === 'Informational').length,
    };

    const total = alerts.length;

    return (
        <div className="w-full h-full p-4 bg-slate-900 text-slate-200 flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Scan Dashboard</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-900/30 p-4 rounded border border-red-800 flex flex-col items-center">
                    <span className="text-3xl font-bold text-red-500">{riskCounts.High}</span>
                    <span className="text-xs uppercase text-red-300">High Risk</span>
                </div>
                <div className="bg-yellow-900/30 p-4 rounded border border-yellow-800 flex flex-col items-center">
                    <span className="text-3xl font-bold text-yellow-500">{riskCounts.Medium}</span>
                    <span className="text-xs uppercase text-yellow-300">Medium Risk</span>
                </div>
                <div className="bg-blue-900/30 p-4 rounded border border-blue-800 flex flex-col items-center">
                    <span className="text-3xl font-bold text-blue-500">{riskCounts.Low}</span>
                    <span className="text-xs uppercase text-blue-300">Low Risk</span>
                </div>
                <div className="bg-green-900/30 p-4 rounded border border-green-800 flex flex-col items-center">
                    <span className="text-3xl font-bold text-green-500">{riskCounts.Informational}</span>
                    <span className="text-xs uppercase text-green-300">Info</span>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded border border-slate-700 mb-6">
                <h3 className="font-bold text-cyan-400 mb-2">Total Vulnerabilities: {total}</h3>
                <p className="text-sm text-slate-400">
                    Most critical issues should be addressed within 24 hours. Use the list view to see remediation templates.
                </p>
            </div>

            <button
                onClick={onViewList}
                className="mt-auto w-full p-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold shadow-lg transition-colors"
            >
                View Detailed List & Fixes
            </button>
        </div>
    );
};