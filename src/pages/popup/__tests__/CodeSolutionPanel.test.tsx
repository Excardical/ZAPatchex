import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeSolutionPanel } from '@pages/popup/CodeSolutionPanel';

// Mock navigator.clipboard
const mockClipboard = {
    writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('CodeSolutionPanel Component', () => {
    const mockSolutions = [
        {
            type: 'Filter',
            solution_description: 'Sanitize Input',
            affected_files: 'login.php',
            code: '<?php echo htmlspecialchars($input); ?>' // PHP detection
        },
        {
            type: 'Config',
            solution_description: 'Update Nginx',
            affected_files: 'nginx.conf',
            code: 'server { add_header X-Frame-Options "DENY"; }' // Nginx detection
        }
    ];

    const defaultProps = {
        solutions: mockSolutions,
        onBack: vi.fn(),
        title: 'XSS Vulnerability',
        fullDescription: 'Cross Site Scripting',
        fullSolution: 'Escape all user input',
        references: [{ name: 'OWASP', url: 'https://owasp.org' }]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('TC-CODE-01: Renders Title, Description and Solution text', () => {
        render(<CodeSolutionPanel {...defaultProps} />);
        expect(screen.getByText('XSS Vulnerability')).toBeInTheDocument();
        expect(screen.getByText('Cross Site Scripting')).toBeInTheDocument();
        expect(screen.getByText('Escape all user input')).toBeInTheDocument();
    });

    it('TC-CODE-02: Displays correct code snippet and file info', () => {
        render(<CodeSolutionPanel {...defaultProps} />);
        expect(screen.getByText('Sanitize Input')).toBeInTheDocument();
        expect(screen.getByText(/login.php/i)).toBeInTheDocument();
        // Check for code content (partial match)
        expect(screen.getByText(/htmlspecialchars/)).toBeInTheDocument();
    });

    it('TC-CODE-03: Navigates between multiple solutions', () => {
        render(<CodeSolutionPanel {...defaultProps} />);

        const nextBtn = screen.getByText('»');
        fireEvent.click(nextBtn);

        // Should show second solution (Nginx)
        expect(screen.getByText('Update Nginx')).toBeInTheDocument();
        expect(screen.getByText(/add_header/)).toBeInTheDocument();
    });

    it('TC-CODE-04: Copy button calls clipboard API', async () => {
        render(<CodeSolutionPanel {...defaultProps} />);

        const copyBtn = screen.getByTitle('Copy code');
        fireEvent.click(copyBtn);

        expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('<?php'));

        await waitFor(() => {
            expect(screen.getByTitle('Copied!')).toBeInTheDocument();
        });
    });

    it('TC-CODE-05: Renders References correctly', () => {
        render(<CodeSolutionPanel {...defaultProps} />);
        const link = screen.getByText('OWASP');
        expect(link).toHaveAttribute('href', 'https://owasp.org');
    });

    it('TC-CODE-06: Disables navigation buttons at boundaries', () => {
        render(<CodeSolutionPanel {...defaultProps} />);

        const prevBtn = screen.getByText('«').closest('button');
        const nextBtn = screen.getByText('»').closest('button');

        // Initially at 0, Prev should be disabled
        expect(prevBtn).toBeDisabled();
        expect(nextBtn).toBeEnabled();

        // Move to end (index 1 of 2)
        fireEvent.click(nextBtn!); // Add ! if TS complains about null, though checking above confirms existence

        expect(prevBtn).toBeEnabled();
        expect(nextBtn).toBeDisabled();
    });
});