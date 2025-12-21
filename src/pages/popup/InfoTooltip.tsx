import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const iconRef = useRef<SVGSVGElement>(null);

  const handleMouseEnter = () => {
    if (!iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();
    const TOOLTIP_WIDTH = 224; // w-56 is approx 224px
    const SCREEN_PADDING = 10;

    // Default position: Centered above the icon
    let left = rect.left + rect.width / 2;
    let top = rect.top - 8; // 8px gap above icon
    let transform = 'translate(-50%, -100%)';

    // --- Boundary Detection ---
    if (left - (TOOLTIP_WIDTH / 2) < SCREEN_PADDING) {
      left = SCREEN_PADDING;
      transform = 'translate(0, -100%)';
    } else if (left + (TOOLTIP_WIDTH / 2) > window.innerWidth - SCREEN_PADDING) {
      left = window.innerWidth - SCREEN_PADDING;
      transform = 'translate(-100%, -100%)';
    }

    if (top - 50 < 0) {
      top = rect.bottom + 8;
      transform = transform.replace('-100%)', '0)');
    }

    setStyle({
      position: 'fixed',
      top: top,
      left: left,
      transform: transform,
      zIndex: 9999,
    });

    setIsVisible(true);
  };

  return (
    <>
      <svg
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
        className="w-4 h-4 text-slate-500 hover:text-cyan-400 cursor-pointer inline-block ml-1.5 align-text-bottom transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      {isVisible && createPortal(
        <div
          className="w-56 p-2 bg-slate-700 text-slate-200 text-xs text-center rounded-md shadow-xl border border-slate-600 pointer-events-none"
          style={style}
        >
          {text}
          {/* Arrow pointing down (Slate-700) */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700"></div>
        </div>,
        document.body
      )}
    </>
  );
};