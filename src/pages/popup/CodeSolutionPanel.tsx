import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CodeSolution } from './VulnerabilityPanel';

interface CodeSolutionPanelProps {
  solutions: CodeSolution[];
  onBack: () => void;
}

// Function to detect programming language from code
const detectLanguage = (code: string): string => {
  const trimmedCode = code.trim();

  if (trimmedCode.includes('<?php') || trimmedCode.includes('<?=')) return 'php';
  if (trimmedCode.includes('using System') || trimmedCode.includes('namespace ') || trimmedCode.includes('public class') || trimmedCode.includes('private void')) return 'csharp';
  if (trimmedCode.includes('import java') || trimmedCode.includes('public class') || trimmedCode.includes('String[] args')) return 'java';
  if (trimmedCode.includes('def ') || trimmedCode.includes('import ') || trimmedCode.includes('if __name__')) return 'python';
  if (trimmedCode.includes('package ') || trimmedCode.includes('@Controller') || trimmedCode.includes('@RestController')) return 'java';
  if (trimmedCode.includes('CREATE TABLE') || trimmedCode.includes('SELECT ') || trimmedCode.includes('INSERT INTO')) return 'sql';
  if (trimmedCode.includes('<!DOCTYPE html') || trimmedCode.includes('<html') || trimmedCode.includes('<script>')) return 'html';
  if (trimmedCode.includes('npm install') || trimmedCode.includes('const ') || trimmedCode.includes('require(') || trimmedCode.includes('export ')) return 'javascript';
  if (trimmedCode.includes('#!/bin/bash') || trimmedCode.includes('echo ') || trimmedCode.includes('chmod ')) return 'bash';
  if (trimmedCode.includes('server {') || trimmedCode.includes('location {') || trimmedCode.includes('listen ')) return 'nginx';
  if (trimmedCode.includes('<Directory') || trimmedCode.includes('<VirtualHost') || trimmedCode.includes('AddHandler')) return 'apache';

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
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? "✓ Copied!" : "📋 Copy"}
    </button>
  );
};

export const CodeSolutionPanel: React.FC<CodeSolutionPanelProps> = ({ solutions, onBack }) => {
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const currentSolution = solutions[currentSolutionIndex];
  const language = detectLanguage(currentSolution.code);

  const handlePrevious = () => {
    setCurrentSolutionIndex(prev => Math.max(prev - 1, 0));
    setShowDetails(false); // Reset details view
  };

  const handleNext = () => {
    setCurrentSolutionIndex(prev => Math.min(prev + 1, solutions.length - 1));
    setShowDetails(false); // Reset details view
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-200">
      {/* Compact Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-slate-800">
        <button
          onClick={onBack}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          {currentSolution.type && (
            <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
              {currentSolution.type}
            </span>
          )}
          {solutions.length > 1 && (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
              {currentSolutionIndex + 1}/{solutions.length}
            </span>
          )}
        </div>
      </header>

      {/* Main Content - One Screen Rule */}
      <main className="flex-grow overflow-hidden flex flex-col">
        {!showDetails ? (
          // QUICK FIX VIEW - Default view
          <div className="flex-grow flex flex-col p-4">
            {/* Immediate Action */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">Quick Fix</h3>
              <div className="bg-slate-800 rounded-lg p-3 relative">
                <CopyButton code={currentSolution.code} />
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{
                    borderRadius: '0.5rem',
                    margin: 0,
                    backgroundColor: 'transparent',
                    fontSize: '0.875rem',
                    lineHeight: '1.4'
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                    }
                  }}
                >
                  {currentSolution.code}
                </SyntaxHighlighter>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                    {language}
                  </span>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>

            {/* Essential Info */}
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-semibold text-cyan-400 mb-1">What This Fixes</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentSolution.solution_description}
              </p>
            </div>

            {/* Navigation */}
            {solutions.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-auto">
                <button
                  onClick={handlePrevious}
                  disabled={currentSolutionIndex === 0}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span className="text-xs text-slate-400">
                  Solution {currentSolutionIndex + 1} of {solutions.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentSolutionIndex === solutions.length - 1}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : (
          // DETAILED VIEW - Progressive disclosure
          <div className="flex-grow overflow-y-auto p-4">
            <button
              onClick={() => setShowDetails(false)}
              className="mb-3 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              ← Back to Quick Fix
            </button>

            <div className="space-y-4">
              {/* Detailed Description */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-base font-bold text-cyan-400 mb-2">Solution Details</h4>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  {currentSolution.solution_description}
                </p>

                {/* Affected Files */}
                <div className="border-t border-slate-700 pt-3">
                  <h5 className="text-sm font-semibold text-cyan-300 mb-2">Where to Apply</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentSolution.affected_files}
                  </p>
                </div>
              </div>

              {/* Full Code with Enhanced Copy */}
              <div className="bg-slate-800 rounded-lg p-4 relative">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-cyan-400">Implementation Code</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                      {language}
                    </span>
                    <CopyButton code={currentSolution.code} />
                  </div>
                </div>

                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{
                    borderRadius: '0.5rem',
                    margin: 0,
                    backgroundColor: '#1e1e1e',
                    fontSize: '0.875rem'
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                    }
                  }}
                >
                  {currentSolution.code}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};