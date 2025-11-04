import type { ResumePayload } from '@/lib/resume/types';
import { formatPhoneNumber } from '@/lib/resume/utils/format';
import { useState } from 'react';

type ContactStepProps = {
  payload: ResumePayload;
  setPayload: React.Dispatch<React.SetStateAction<ResumePayload>>;
  contactHelpId: string;
};

export type ContactErrors = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
};

function validateEmail(email: string): boolean {
  if (!email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone.trim()) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
}

export function ContactStep({ payload, setPayload, contactHelpId }: ContactStepProps) {
  const [localErrors, setLocalErrors] = useState<ContactErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof ContactErrors>>(new Set());
  
  const errors = localErrors;
  
  const validateField = (field: keyof ContactErrors, value: string) => {
    let error: string | undefined;
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Please enter your name.';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 letters.';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Please enter your email address.';
        } else if (!validateEmail(value)) {
          error = 'Please enter a valid email like name@email.com';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Please enter your phone number.';
        } else if (!validatePhone(value)) {
          error = 'Phone number must have at least 7 digits.';
        }
        break;
      case 'location':
        if (!value.trim()) {
          error = 'Please enter your city and state.';
        } else if (value.trim().length < 2) {
          error = 'Location must be at least 2 letters.';
        }
        break;
    }
    
    const newErrors = { ...localErrors, [field]: error };
    if (!error) delete newErrors[field];
    setLocalErrors(newErrors);
    
    return error;
  };
  
  const handleBlur = (field: keyof ContactErrors, value: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    validateField(field, value);
  };

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
            className={`rounded-lg border-2 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:outline-none focus:ring-4 ${
              touchedFields.has('name') && errors.name
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-200'
            }`}
            value={payload.name}
            onChange={event => {
              setPayload(prev => ({ ...prev, name: event.target.value }));
              if (touchedFields.has('name')) {
                validateField('name', event.target.value);
              }
            }}
            onBlur={() => {
              const trimmed = payload.name.trim().replace(/\s+/g, ' ');
              setPayload(prev => ({ ...prev, name: trimmed }));
              handleBlur('name', trimmed);
            }}
            placeholder="Full name"
            autoComplete="name"
            autoCapitalize="words"
            aria-describedby={contactHelpId}
            aria-invalid={touchedFields.has('name') && !!errors.name}
            required
          />
          {touchedFields.has('name') && errors.name && (
            <span className="text-sm text-red-600" role="alert">{errors.name}</span>
          )}
        </label>
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            Email{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            type="email"
            className={`rounded-lg border-2 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:outline-none focus:ring-4 ${
              touchedFields.has('email') && errors.email
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-200'
            }`}
            value={payload.email}
            onChange={event => {
              const trimmed = event.target.value.trim();
              setPayload(prev => ({ ...prev, email: trimmed }));
              if (touchedFields.has('email')) {
                validateField('email', trimmed);
              }
            }}
            onBlur={() => handleBlur('email', payload.email)}
            placeholder="your.name@email.com"
            autoComplete="email"
            inputMode="email"
            aria-describedby={contactHelpId}
            aria-invalid={touchedFields.has('email') && !!errors.email}
            required
          />
          {touchedFields.has('email') && errors.email && (
            <span className="text-sm text-red-600" role="alert">{errors.email}</span>
          )}
        </label>
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            Phone{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            className={`rounded-lg border-2 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:outline-none focus:ring-4 ${
              touchedFields.has('phone') && errors.phone
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-200'
            }`}
            value={payload.phone ?? ''}
            onChange={event => {
              setPayload(prev => ({ ...prev, phone: event.target.value }));
              if (touchedFields.has('phone')) {
                validateField('phone', event.target.value);
              }
            }}
            onBlur={() => {
              const formatted = formatPhoneNumber(payload.phone ?? '');
              setPayload(prev => ({ ...prev, phone: formatted }));
              handleBlur('phone', formatted);
            }}
            placeholder="5551234567"
            autoComplete="tel"
            inputMode="tel"
            aria-describedby={contactHelpId}
            aria-invalid={touchedFields.has('phone') && !!errors.phone}
            required
          />
          {touchedFields.has('phone') && errors.phone ? (
            <span className="text-sm text-red-600" role="alert">{errors.phone}</span>
          ) : (
            <span className="text-sm text-neutral-500">Type any way. We&apos;ll fix the format.</span>
          )}
        </label>
        <label className="flex flex-col gap-2" title="Required field">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
            City &amp; State{' '}
            <abbr title="Required" className="text-lg text-red-600 no-underline">
              *
            </abbr>
          </span>
          <input
            className={`rounded-lg border-2 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:outline-none focus:ring-4 ${
              touchedFields.has('location') && errors.location
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-200'
            }`}
            value={payload.location ?? ''}
            onChange={event => {
              setPayload(prev => ({ ...prev, location: event.target.value }));
              if (touchedFields.has('location')) {
                validateField('location', event.target.value);
              }
            }}
            onBlur={() => {
              const capitalized = (payload.location ?? '')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              setPayload(prev => ({ ...prev, location: capitalized }));
              handleBlur('location', capitalized);
            }}
            placeholder="Jackson, MS"
            autoComplete="address-level2"
            autoCapitalize="words"
            aria-describedby={contactHelpId}
            aria-invalid={touchedFields.has('location') && !!errors.location}
            required
          />
          {touchedFields.has('location') && errors.location ? (
            <span className="text-sm text-red-600" role="alert">{errors.location}</span>
          ) : (
            <span className="text-sm text-neutral-500">City and state. Example: Jackson, MS</span>
          )}
        </label>
      </div>
    </div>
  );
}
