import type { ResumePayload } from '@/lib/resume/types';
import { formatPhoneNumber } from '@/lib/resume/utils/format';

type ContactStepProps = {
  payload: ResumePayload;
  setPayload: React.Dispatch<React.SetStateAction<ResumePayload>>;
  contactHelpId: string;
};

export function ContactStep({ payload, setPayload, contactHelpId }: ContactStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <p id={contactHelpId} className="text-lg text-neutral-600">
        We only use this information to build the PDF. It stays on this device.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            Name{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            value={payload.name}
            onChange={event => setPayload(prev => ({ ...prev, name: event.target.value }))}
            placeholder="Full name"
            autoComplete="name"
            aria-describedby={contactHelpId}
            required
          />
        </label>
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            Email{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            value={payload.email}
            onChange={event => setPayload(prev => ({ ...prev, email: event.target.value }))}
            placeholder="email@example.com"
            autoComplete="email"
            inputMode="email"
            aria-describedby={contactHelpId}
            required
          />
        </label>
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            Phone{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            value={payload.phone ?? ''}
            onChange={event => setPayload(prev => ({ ...prev, phone: event.target.value }))}
            onBlur={() =>
              setPayload(prev => ({
                ...prev,
                phone: formatPhoneNumber(prev.phone ?? ''),
              }))
            }
            placeholder="(555) 123-4567"
            autoComplete="tel"
            inputMode="tel"
            aria-describedby={contactHelpId}
            required
          />
          <span className="text-sm text-neutral-500">Include the area code so employers can call you.</span>
        </label>
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            City &amp; State{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            value={payload.location ?? ''}
            onChange={event => setPayload(prev => ({ ...prev, location: event.target.value }))}
            placeholder="City, ST"
            autoComplete="address-level2"
            aria-describedby={contactHelpId}
            required
          />
          <span className="text-sm text-neutral-500">A city and state tells employers you are nearby.</span>
        </label>
      </div>
    </div>
  );
}
