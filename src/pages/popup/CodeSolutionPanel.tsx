import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CodeSolution } from './VulnerabilityPanel';

interface CodeSolutionPanelProps {
  solution: CodeSolution;
  onBack: () => void;
}

export const CodeSolutionPanel: React.FC<CodeSolutionPanelProps> = ({ solution, onBack }) => {
  return (
    <div className="w-full h-full flex flex-col p-3 bg-slate-900 text-slate-200">
      <header className="flex-shrink-0 pb-2 border-b border-slate-700">
        <button onClick={onBack} className="text-cyan-400 hover:underline text-sm">
          &larr; Back to Details
        </button>
        <h2 className="text-md font-semibold text-center mt-2">Code Solution Sample</h2>
      </header>
      <main className="flex-grow overflow-y-auto py-3 text-sm">
        <div className="space-y-3 bg-slate-800 p-3 rounded-lg">
            <div>
                <h4 className="text-sm font-bold text-cyan-400 mb-1">Solution Description</h4>
                <p className="italic text-slate-300 whitespace-pre-wrap text-xs">{solution.solution_description}</p>
            </div>
            <div>
                <h4 className="text-sm font-bold text-cyan-400 mb-1">Typical Location</h4>
                <p className="text-slate-300 whitespace-pre-wrap text-xs">{solution.affected_files}</p>
            </div>
            <div>
                <h4 className="text-sm font-bold text-cyan-400 mb-1">Sample Code</h4>
                <SyntaxHighlighter 
                    language="javascript" 
                    style={vscDarkPlus}
                    customStyle={{
                        borderRadius: '0.375rem',
                        margin: 0,
                        backgroundColor: '#1e1e1e'
                    }}
                    codeTagProps={{
                        style: {
                            fontSize: '0.75rem',
                            fontFamily: 'monospace'
                        }
                    }}
                >
                    {solution.code}
                </SyntaxHighlighter>
            </div>
        </div>
      </main>
    </div>
  );
};