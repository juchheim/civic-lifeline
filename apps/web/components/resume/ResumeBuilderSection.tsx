'use client';

import { useEffect, useMemo, useState } from 'react';
import { downloadPdf, type TemplateName } from '@/lib/resume/download-pdf';
import type { ResumePayload } from '@/lib/resume/types';
import { TEMPLATES } from '@/resume/shared/templates';

const STORAGE_KEY = 'resume.draft';
const DEFAULT_PAYLOAD: ResumePayload = {
  name: '',
  email: '',
  summary: '',
  skills: [],
  experience: [],
};

export function ResumeBuilderSection() {
  const [payload, setPayload] = useState<ResumePayload>(DEFAULT_PAYLOAD);
  const [template, setTemplate] = useState<TemplateName>('classic');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ResumePayload;
        setPayload({ ...DEFAULT_PAYLOAD, ...parsed });
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [payload]);

  const hasRequiredFields = useMemo(() => payload.name.trim() && payload.email.trim(), [payload]);

  const handleGenerate = async () => {
    if (!hasRequiredFields) {
      setStatus('Please add your name and email first.');
      return;
    }
    setStatus('Generating PDF...');
    try {
      await downloadPdf(payload, template);
      setStatus('PDF downloaded to your device.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
      setStatus(message);
    }
  };

  const handleReset = () => {
    setPayload(DEFAULT_PAYLOAD);
    setStatus('Cleared the draft.');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <section id="resume-builder" className="mt-10 flex flex-col gap-6 rounded border bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">Build Your Resume</h2>
        <p className="text-sm text-neutral-500">
          Fill in the essentials, pick a template, and generate a print-ready PDF. Your draft saves locally to this browser.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Template</span>
          <select
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={template}
            onChange={event => setTemplate(event.target.value as TemplateName)}
          >
            {TEMPLATES.map(option => (
              <option key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={payload.name}
            onChange={event => setPayload(prev => ({ ...prev, name: event.target.value }))}
            placeholder="Jane Doe"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={payload.email}
            onChange={event => setPayload(prev => ({ ...prev, email: event.target.value }))}
            placeholder="jane@example.com"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Summary</span>
          <textarea
            className="h-32 rounded border border-neutral-300 px-3 py-2 text-sm"
            value={payload.summary ?? ''}
            onChange={event => setPayload(prev => ({ ...prev, summary: event.target.value }))}
            placeholder="Highlight your skills, experience, and mission."
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Skills (comma separated)</span>
          <input
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={(payload.skills ?? []).join(', ')}
            onChange={event =>
              setPayload(prev => ({
                ...prev,
                skills: event.target.value
                  .split(',')
                  .map(skill => skill.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="React, Node.js, Accessibility"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <button
          type="button"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-500"
          onClick={handleGenerate}
          disabled={!hasRequiredFields}
        >
          Generate PDF
        </button>
        <button
          type="button"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
          onClick={handleReset}
        >
          Reset Draft
        </button>
        {status && <p className="text-sm text-neutral-600 md:ml-4">{status}</p>}
      </div>
    </section>
  );
}
