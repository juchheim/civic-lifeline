import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResumeBuilderSection } from '../ResumeBuilderSection';
import { STORAGE_VERSION } from '../constants';
import { rewriteSummary } from '@/lib/resume/rewrite-summary';

vi.mock('@/lib/resume/rewrite-summary', () => ({
  rewriteSummary: vi.fn(),
}));

const STORAGE_KEY = 'resume.draft';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
  readonly __store: Map<string, string>;
};

function createLocalStorageMock(): LocalStorageMock {
  const store = new Map<string, string>();
  return {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: key => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: index => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    __store: store,
  };
}

describe('ResumeBuilderSection', () => {
  let localStorageMock: LocalStorageMock;
  let openMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;

  const getFirstEnabledButton = (label: RegExp | string) => {
    const matches = screen.getAllByRole('button', { name: label });
    const enabled = matches.find(button => {
      const ariaDisabled = button.getAttribute('aria-disabled');
      return !button.hasAttribute('disabled') && ariaDisabled !== 'true';
    });
    if (!enabled) {
      throw new Error(`No enabled button found for label ${label.toString()}`);
    }
    return enabled as HTMLButtonElement;
  };

  const chooseTemplate = async (label: RegExp | string = /Classic/i) => {
    const matcher = typeof label === 'string' ? new RegExp(label, 'i') : label;
    await user.click(screen.getByLabelText(matcher));
  };

  beforeEach(() => {
    user = userEvent.setup();

    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    window.scrollTo = vi.fn();
    openMock = vi.fn(() => ({
      document: { write: vi.fn(), title: '' },
      closed: false,
      close: vi.fn(),
      location: { href: '' },
    }));
    Object.defineProperty(window, 'open', {
      value: openMock,
      configurable: true,
    });

    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ previewUrl: '/preview/test-resume.pdf' }),
    }));
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('completes the resume flow, persists the draft, and opens the preview', async () => {
    const rewriteSummaryMock = vi.mocked(rewriteSummary);
    rewriteSummaryMock.mockResolvedValue(
      'Customer-focused associate with 4 years supporting busy retail teams and keeping shoppers happy.',
    );

    render(<ResumeBuilderSection />);

    await chooseTemplate();
    await user.click(getFirstEnabledButton(/Next: Contact info/i));

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const phoneInput = screen.getByLabelText(/Phone/i);
    const cityInput = screen.getByLabelText(/^City/i);
    const stateSelect = screen.getByLabelText(/^State/i);

    const contactNextButtons = screen.getAllByRole('button', { name: /Next: Skills/i });
    contactNextButtons.forEach(button => expect(button).toBeDisabled());

    await user.clear(nameInput);
    await user.type(nameInput, 'Alex Candidate');
    await user.clear(emailInput);
    await user.type(emailInput, 'alex@example.com');
    await user.clear(phoneInput);
    await user.type(phoneInput, '5551234567');
    await user.clear(cityInput);
    await user.type(cityInput, 'Springfield');
    await user.selectOptions(stateSelect, 'IL');

    await user.click(getFirstEnabledButton(/Next: Skills/i));
    await user.click(screen.getByRole('button', { name: /^Customer Service$/i }));

    await user.click(getFirstEnabledButton(/Next: Experience/i));
    await user.click(getFirstEnabledButton(/Next: Education/i));
    await user.click(getFirstEnabledButton(/Next: Summary/i));

    await waitFor(() => expect(rewriteSummaryMock).toHaveBeenCalled());

    const summaryArea = screen.getByTitle('Write 2-3 sentences about your experience') as HTMLTextAreaElement;
    await waitFor(() => expect(summaryArea.value).toContain('Customer-focused associate'));

    await user.click(getFirstEnabledButton(/Next: Preview/i));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(openMock).not.toHaveBeenCalled();

    const previewButtons = screen.getAllByRole('button', { name: /Preview Resume/i });
    const previewButton = previewButtons.find(button => !button.hasAttribute('disabled'));
    expect(previewButton).toBeDefined();
    await user.click(previewButton as HTMLButtonElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pdf?template=classic',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(openMock).toHaveBeenCalled();

    await waitFor(() => expect(localStorageMock.getItem(STORAGE_KEY)).not.toBeNull());

    const storedDraft = localStorageMock.getItem(STORAGE_KEY);
    if (storedDraft) {
      const parsed = JSON.parse(storedDraft) as {
        version: number;
        payload: { name: string; email: string; phone: string; location: string; summary: string };
        step: string;
      };
      expect(parsed.payload.name).toBe('Alex Candidate');
      expect(parsed.payload.email).toBe('alex@example.com');
      expect(parsed.payload.phone).toContain('(555) 123-4567');
      expect(parsed.payload.summary).toContain('Customer-focused');
      expect(parsed.step).toBe('preview');
    }
  });

  it('keeps completed step chips interactive when returning to the template', async () => {
    render(<ResumeBuilderSection />);

    await chooseTemplate();
    await user.click(getFirstEnabledButton(/Next: Contact info/i));

    // Navigate back to the Template step using the chip controls.
    await user.click(screen.getByLabelText(/Step 1: Template/i));

    const contactChip = screen.getByLabelText(/Step 2: Contact info/i);
    expect(contactChip).not.toHaveAttribute('disabled');
    expect(contactChip.getAttribute('aria-disabled')).not.toBe('true');

    await user.click(contactChip);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Contact info' })).toBeVisible());
  });

  it('only shows the preview shortcut after at least one skill is added', async () => {
    render(<ResumeBuilderSection />);

    await chooseTemplate();
    await user.click(getFirstEnabledButton(/Next: Contact info/i));

    await user.type(screen.getByLabelText(/Name/i), 'Jordan Example');
    await user.type(screen.getByLabelText(/Email/i), 'jordan@example.com');
    await user.type(screen.getByLabelText(/Phone/i), '5557891234');
    await user.type(screen.getByLabelText(/^City/i), 'Dayton');
    await user.selectOptions(screen.getByLabelText(/^State/i), 'OH');

    await user.click(getFirstEnabledButton(/Next: Skills/i));

    expect(screen.queryByRole('button', { name: /Preview so far/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Customer Service$/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Preview so far/i })).toBeVisible());
  });

  it('shows the loading state and auto-fills the summary before offering regenerate controls', async () => {
    const rewriteSummaryMock = vi.mocked(rewriteSummary);
    rewriteSummaryMock
      .mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () => resolve('Dependable teammate with 3 years keeping checkout lines moving and coaching new cashiers.'),
              50,
            ),
          ),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () => resolve('Reliable associate who coaches cashiers, keeps lines moving, and brings calm energy during rushes.'),
              50,
            ),
          ),
      );

    render(<ResumeBuilderSection />);

    await chooseTemplate();
    await user.click(getFirstEnabledButton(/Next: Contact info/i));

    await user.type(screen.getByLabelText(/Name/i), 'Jamie Retail');
    await user.type(screen.getByLabelText(/Email/i), 'jamie@example.com');
    await user.type(screen.getByLabelText(/Phone/i), '5559876543');
    await user.type(screen.getByLabelText(/^City/i), 'Denver');
    await user.selectOptions(screen.getByLabelText(/^State/i), 'CO');

    await user.click(getFirstEnabledButton(/Next: Skills/i));
    await user.click(screen.getByRole('button', { name: /^Customer Service$/i }));

    await user.click(getFirstEnabledButton(/Next: Experience/i));
    await user.click(getFirstEnabledButton(/Next: Education/i));
    await user.click(getFirstEnabledButton(/Next: Summary/i));

    await waitFor(() => {
      expect(screen.getByText(/Hang tight—your summary is on the way/i)).toBeInTheDocument();
    });

    await waitFor(() => expect(rewriteSummaryMock).toHaveBeenCalledTimes(1));

    const summaryArea = await waitFor(
      () => screen.getByTitle('Write 2-3 sentences about your experience') as HTMLTextAreaElement,
    );
    await waitFor(() =>
      expect(summaryArea.value).toBe(
        'Dependable teammate with 3 years keeping checkout lines moving and coaching new cashiers.',
      ),
    );

    expect(screen.getByText(/We generated this summary using/i)).toBeInTheDocument();
    expect(screen.getByText(/top skills/i)).toBeInTheDocument();

    const regenerateButton = screen.getByRole('button', { name: /Regenerate summary/i });
    await user.click(regenerateButton);
    expect(regenerateButton).toBeDisabled();

    await waitFor(() => expect(rewriteSummaryMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(summaryArea.value).toBe(
        'Reliable associate who coaches cashiers, keeps lines moving, and brings calm energy during rushes.',
      ),
    );
  });

  it('requires a template selection before continuing from Step 1', async () => {
    render(<ResumeBuilderSection />);

    const nextButton = screen.getByRole('button', { name: /Next: Contact info/i });
    expect(nextButton).toHaveAttribute('aria-disabled', 'true');

    await user.click(nextButton);

    const errorMessage = await screen.findByText('Select a template to continue.');
    expect(errorMessage).toBeInTheDocument();

    await chooseTemplate(/Minimal/i);

    await waitFor(() => expect(screen.queryByText('Select a template to continue.')).not.toBeInTheDocument());
    expect(nextButton).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(nextButton);
    expect(screen.getByRole('heading', { name: 'Contact info' })).toBeInTheDocument();
  });

  it('hydrates from saved draft data on initial render', async () => {
    const savedPayload = {
      version: STORAGE_VERSION,
      payload: {
        name: 'Taylor Example',
        email: 'taylor@example.com',
        phone: '(555) 222-3333',
        location: 'Columbus, OH',
        summary: 'Energetic associate ready to support teams with dependable service.',
        skills: ['Customer Service'],
        experience: [],
        education: [],
      },
      template: 'modern' as const,
      step: 'summary' as const,
      maxStep: 'summary' as const,
      summaryEdited: false,
    };

    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(savedPayload));

    render(<ResumeBuilderSection />);

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    const summaryArea = screen.getByTitle('Write 2-3 sentences about your experience') as HTMLTextAreaElement;
    expect(summaryArea.value).toBe('Energetic associate ready to support teams with dependable service.');
  });
});
