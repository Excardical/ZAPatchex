import React from 'react';

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="group relative inline-flex ml-1.5">
      <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-56 mb-2 p-2 bg-slate-700 text-slate-200 text-xs text-center rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  );
};