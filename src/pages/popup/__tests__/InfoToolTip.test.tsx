import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTooltip } from '../InfoTooltip';

describe('InfoTooltip Component', () => {
    it('TC-TOOL-01: Icon renders and is visible', () => {
        render(<InfoTooltip text="Help Text" />);
        const icon = document.querySelector('svg');
        expect(icon).toBeInTheDocument();
    });

    it('TC-TOOL-02: Tooltip appears on hover and has fixed positioning', () => {
        render(<InfoTooltip text="Secret Info" />);
        const icon = document.querySelector('svg')!;

        fireEvent.mouseEnter(icon);

        const tooltip = screen.getByText('Secret Info');
        expect(tooltip).toBeInTheDocument();

        // FIXED: Check JS style property, not CSS class
        expect(tooltip).toHaveStyle({ position: 'fixed' });
    });

    it('TC-TOOL-03: Tooltip disappears on mouse leave', () => {
        render(<InfoTooltip text="Secret Info" />);
        const icon = document.querySelector('svg')!;

        fireEvent.mouseEnter(icon);
        expect(screen.getByText('Secret Info')).toBeInTheDocument();

        fireEvent.mouseLeave(icon);
        expect(screen.queryByText('Secret Info')).not.toBeInTheDocument();
    });
});