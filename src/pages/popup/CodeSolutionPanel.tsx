import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CodeSolution } from './VulnerabilityPanel';

interface CodeSolutionPanelProps {
  solutions: CodeSolution[];
  onBack: () => void;
  // NEW: Props for Full Detailed View
  title: string;
  fullDescription?: string;
  fullSolution?: string;
  references?: Array<{ name: string; url: string }>;
}

// Function to detect programming language from code
const detectLanguage = (code: string): string => {
  const trimmedCode = code.trim();
  if (trimmedCode.includes('<?php') || trimmedCode.includes('<?=')) return 'php';
  if (trimmedCode.includes('using System') || trimmedCode.includes('namespace ')) return 'csharp';
  if (trimmedCode.includes('import java') || trimmedCode.includes('public class')) return 'java';
  if (trimmedCode.includes('def ') || trimmedCode.includes('import ')) return 'python';
  if (trimmedCode.includes('CREATE TABLE') || trimmedCode.includes('SELECT ')) return 'sql';
  if (trimmedCode.includes('<!DOCTYPE html') || trimmedCode.includes('<html')) return 'html';
  if (trimmedCode.includes('npm install') || trimmedCode.includes('const ') || trimmedCode.includes('require(')) return 'javascript';
  if (trimmedCode.includes('server {') || trimmedCode.includes('location {') || trimmedCode.includes('add_header')) return 'nginx';
  if (trimmedCode.includes('<Directory') || trimmedCode.includes('<VirtualHost') || trimmedCode.includes('Header set')) return 'apache';
  if (trimmedCode.includes('app.use') || trimmedCode.includes('app.disable')) return 'javascript';
  return 'javascript'; // Default fallback
};

// Copy button component
const CopyButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy code:', err); }
  };
  return (
    <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors" title={copied ? "Copied!" : "Copy code"}>
      {copied ? "✓" : "📋"}
    </button>
  );
};

export const CodeSolutionPanel: React.FC<CodeSolutionPanelProps> = ({
  solutions, onBack, title, fullDescription, fullSolution, references
}) => {
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const currentSolution = solutions[currentSolutionIndex];
  const language = detectLanguage(currentSolution.code);

  const handlePrevious = () => {
    setCurrentSolutionIndex(prev => Math.max(prev - 1, 0));
    setShowDetails(false);
  };

  const handleNext = () => {
    setCurrentSolutionIndex(prev => Math.min(prev + 1, solutions.length - 1));
    setShowDetails(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-slate-800">
        <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {currentSolution.type && <span className="px-2 py-1 bg-cyan-600 text-white text-[10px] uppercase font-bold rounded-sm tracking-wide">{currentSolution.type}</span>}
          {solutions.length > 1 && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{currentSolutionIndex + 1}/{solutions.length}</span>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden flex flex-col">
        {!showDetails ? (
          // QUICK FIX VIEW
          <div className="flex-grow flex flex-col p-4">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">Quick Fix</h3>
              <div className="bg-slate-800 rounded-lg p-3 relative border border-slate-700 shadow-md">
                <CopyButton code={currentSolution.code} />
                <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ borderRadius: '0.5rem', margin: 0, backgroundColor: 'transparent', fontSize: '0.80rem', lineHeight: '1.4' }}>
                  {currentSolution.code}
                </SyntaxHighlighter>
                <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-2">
                  <span className="text-xs text-slate-400 font-mono">{language}</span>
                  <button onClick={() => setShowDetails(true)} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
                    View Full Details →
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-cyan-400 mb-1">Context</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{currentSolution.solution_description}</p>
            </div>

            {solutions.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-auto">
                <button onClick={handlePrevious} disabled={currentSolutionIndex === 0} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition-colors">
                  <span className="text-xl">«</span>
                </button>
                <span className="text-xs text-slate-400">Option {currentSolutionIndex + 1} of {solutions.length}</span>
                <button onClick={handleNext} disabled={currentSolutionIndex === solutions.length - 1} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition-colors">
                  <span className="text-xl">»</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // DETAILED VIEW (FULL VERSION)
          <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
            <button onClick={() => setShowDetails(false)} className="mb-3 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              ← Back to Quick Fix
            </button>

            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-bold text-white mb-2">{title}</h4>

                {/* Full Description */}
                {fullDescription && (
                  <div className="mb-4">
                    <h5 className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-1">Vulnerability Description</h5>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{fullDescription}</p>
                  </div>
                )}

                {/* Full Remediation */}
                {fullSolution && (
                  <div className="mb-4">
                    <h5 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Remediation Strategy</h5>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{fullSolution}</p>
                  </div>
                )}

                {/* Specific Implementation Info */}
                <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50 mt-2">
                  <h5 className="text-xs font-bold text-slate-400 uppercase mb-1">Implementation Step</h5>
                  <p className="text-sm text-slate-200">{currentSolution.solution_description}</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">File: {currentSolution.affected_files}</p>
                </div>
              </div>

              {/* Full Code Block */}
              <div className="bg-slate-800 rounded-lg p-4 relative border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-cyan-400">Code Patch</h4>
                  <CopyButton code={currentSolution.code} />
                </div>
                <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ borderRadius: '0.5rem', margin: 0, backgroundColor: '#0f172a', fontSize: '0.85rem' }}>
                  {currentSolution.code}
                </SyntaxHighlighter>
              </div>

              {/* References */}
              {references && references.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-sm font-bold text-cyan-400 mb-2">References</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {references.map((ref, idx) => (
                      <li key={idx} className="text-xs truncate">
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                          {ref.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};