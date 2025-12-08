import React, { useState, useEffect } from 'react';
import { GroupedAlert } from './VulnerabilityPanel';
import { getSites } from '../../utils/zapApi';

interface DashboardProps {
    alerts: GroupedAlert[];
    onViewList: () => void;
    host: string;
    apiKey: string;
    selectedSite: string;
    onSiteSelect: (site: string) => void;
}

export const DashboardPanel: React.FC<DashboardProps> = ({
    alerts,
    onViewList,
    host,
    apiKey,
    selectedSite,
    onSiteSelect
}) => {
    const [sites, setSites] = useState<string[]>([]);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                const list = await getSites(host, apiKey);
                setSites(list);
            } catch (e) { console.error("Failed to load sites", e); }
        };
        fetchSites();
    }, [host, apiKey]);

    const riskCounts = {
        High: alerts.filter(a => a.risk === 'High').length,
        Medium: alerts.filter(a => a.risk === 'Medium').length,
        Low: alerts.filter(a => a.risk === 'Low').length,
        Informational: alerts.filter(a => a.risk === 'Informational').length,
    };

    const total = alerts.length;

    return (
        <div className="w-full h-full p-4 bg-slate-900 text-slate-200 flex flex-col font-sans">
            {/* Title Removed as requested */}

            {/* Site Filter */}
            <div className="mb-4 mt-2">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Filter Scope</label>
                <div className="relative">
                    <select
                        value={selectedSite}
                        onChange={(e) => onSiteSelect(e.target.value)}
                        className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-sm text-white focus:border-cyan-500 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                    >
                        <option value="">All Sites (Global View)</option>
                        {sites.map(site => (
                            <option key={site} value={site}>{site}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-xs">▼</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-900/20 p-4 rounded border border-red-900/50 flex flex-col items-center">
                    <span className="text-3xl font-bold text-red-500">{riskCounts.High}</span>
                    <span className="text-xs uppercase text-red-400/70 font-semibold mt-1">High Risk</span>
                </div>
                <div className="bg-yellow-900/20 p-4 rounded border border-yellow-900/50 flex flex-col items-center">
                    <span className="text-3xl font-bold text-yellow-500">{riskCounts.Medium}</span>
                    <span className="text-xs uppercase text-yellow-400/70 font-semibold mt-1">Medium Risk</span>
                </div>
                <div className="bg-blue-900/20 p-4 rounded border border-blue-900/50 flex flex-col items-center">
                    <span className="text-3xl font-bold text-blue-500">{riskCounts.Low}</span>
                    <span className="text-xs uppercase text-blue-400/70 font-semibold mt-1">Low Risk</span>
                </div>
                <div className="bg-green-900/20 p-4 rounded border border-green-900/50 flex flex-col items-center">
                    <span className="text-3xl font-bold text-green-500">{riskCounts.Informational}</span>
                    <span className="text-xs uppercase text-green-400/70 font-semibold mt-1">Info</span>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded border border-slate-700 mb-6 shadow-inner">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="font-bold text-cyan-400 text-lg">{total} Vulnerabilities</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {selectedSite ? "Found on selected target" : "Found across all targets"}
                        </p>
                    </div>
                    {/* Tiny visual indicator */}
                    <div className="h-2 w-16 bg-slate-700 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(riskCounts.High / total) * 100}%` }} className="bg-red-500 h-full" />
                        <div style={{ width: `${(riskCounts.Medium / total) * 100}%` }} className="bg-yellow-500 h-full" />
                        <div style={{ width: `${(riskCounts.Low / total) * 100}%` }} className="bg-blue-500 h-full" />
                    </div>
                </div>
            </div>

            <button
                onClick={onViewList}
                className="mt-auto w-full p-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold shadow-lg transition-all active:scale-[0.98]"
            >
                Review Vulnerabilities →
            </button>
        </div>
    );
};