import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResumeBuilderSection } from '../ResumeBuilderSection';
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
    render(<ResumeBuilderSection />);

    await chooseTemplate();
    await user.click(getFirstEnabledButton(/Next: Contact info/i));

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const phoneInput = screen.getByLabelText(/Phone/i);
    const cityInput = screen.getByLabelText(/^City/i);
    const stateSelect = screen.getByLabelText(/^State/i);

    const contactNextButtons = screen.getAllByRole('button', { name: /Next: Summary/i });
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

    const enabledSummaryButton = getFirstEnabledButton(/Next: Summary/i);
    await user.click(enabledSummaryButton);

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    const summaryArea = screen.getByTitle('Write 2-3 sentences about your experience');
    await user.clear(summaryArea);
    await user.type(
      summaryArea,
      'Customer-focused associate with 4 years supporting busy retail teams. Skilled in POS, training peers, and handling peak rushes.',
    );

    await user.click(getFirstEnabledButton(/Next: Skills/i));
    await user.click(screen.getByRole('button', { name: /^Customer Service$/i }));
    await user.click(getFirstEnabledButton(/Next: Experience/i));
    await user.click(getFirstEnabledButton(/Next: Education/i));
    await user.click(getFirstEnabledButton(/Next: Preview/i));

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

  it('displays the AI summary diff suggestion when rewrite provides new content', async () => {
    const rewriteSummaryMock = vi.mocked(rewriteSummary);
    rewriteSummaryMock.mockResolvedValue(
      'Dedicated team member with 4 years guiding retail associates, driving sales, and ensuring customer satisfaction.',
    );

    render(<ResumeBuilderSection />);

    await chooseTemplate();
    await user.click(getFirstEnabledButton(/Next: Contact info/i));

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const phoneInput = screen.getByLabelText(/Phone/i);
    const cityInput = screen.getByLabelText(/^City/i);
    const stateSelect = screen.getByLabelText(/^State/i);

    await user.type(nameInput, 'Jamie Retail');
    await user.type(emailInput, 'jamie@example.com');
    await user.type(phoneInput, '5559876543');
    await user.type(cityInput, 'Denver');
    await user.selectOptions(stateSelect, 'CO');

    await user.click(getFirstEnabledButton(/Next: Summary/i));

    const summaryArea = screen.getByTitle('Write 2-3 sentences about your experience');
    await user.clear(summaryArea);
    await user.type(
      summaryArea,
      'Retail pro with 4 years helping stores stay organized and customers happy. Looking to bring strong service skills to a lead role.',
    );

    await user.click(screen.getByRole('button', { name: 'Rewrite with AI' }));

    await waitFor(() => expect(rewriteSummaryMock).toHaveBeenCalled());

    const suggestionHeading = await screen.findByRole('heading', { name: 'AI suggestion' });
    const currentHeading = screen.getByRole('heading', { name: 'Current summary' });
    expect(currentHeading).toBeInTheDocument();

    const diffCard = suggestionHeading.parentElement?.parentElement?.parentElement as HTMLDivElement | undefined;
    expect(diffCard).toBeTruthy();
    if (diffCard) {
      expect(within(diffCard).getByText('Use AI suggestion')).toBeInTheDocument();
      expect(within(diffCard).getByText('Keep original')).toBeInTheDocument();
      expect(diffCard.innerHTML).toMatchInlineSnapshot(`"<div class="flex flex-col gap-4 md:flex-row"><div class="flex-1"><h4 class="text-sm font-semibold text-neutral-700">Current summary</h4><p class="mt-1 whitespace-pre-wrap text-sm text-neutral-700"><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">Retail</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">pro</span><span> </span><span>with 4 years </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">helping stores stay organized and customers happy. Looking to</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">bring</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">strong</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">service</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">skills</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">to</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">a</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">lead</span><span> </span><span class="bg-yellow-100 line-through decoration-2 decoration-yellow-500">role.</span></p></div><div class="flex-1"><h4 class="text-sm font-semibold text-neutral-700">AI suggestion</h4><p class="mt-1 whitespace-pre-wrap text-sm text-neutral-700"><span class="rounded bg-green-100 px-0.5 text-neutral-900">Dedicated</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">team</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">member </span><span>with 4 years </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">guiding</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">retail</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">associates,</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">driving</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">sales,</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">and</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">ensuring</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">customer</span><span> </span><span class="rounded bg-green-100 px-0.5 text-neutral-900">satisfaction.</span></p></div></div><div class="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" class="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900">Keep original</button><button type="button" class="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800">Use AI suggestion</button></div>"`);
    }
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
      version: 2,
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
    };

    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(savedPayload));

    render(<ResumeBuilderSection />);

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    const summaryArea = screen.getByTitle('Write 2-3 sentences about your experience') as HTMLTextAreaElement;
    expect(summaryArea.value).toBe('Energetic associate ready to support teams with dependable service.');
  });
});
