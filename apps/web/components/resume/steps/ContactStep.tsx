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
  city?: string;
  state?: string;
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

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
      case 'city':
        if (!value.trim()) {
          error = 'Please enter your city.';
        } else if (value.trim().length < 2) {
          error = 'City must be at least 2 letters.';
        }
        break;
      case 'state':
        if (!value.trim()) {
          error = 'Please select your state.';
        } else if (value.length !== 2) {
          error = 'Please select a state from the list.';
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
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
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
              // Strip all non-numeric characters automatically
              const digitsOnly = event.target.value.replace(/\D/g, '');
              setPayload(prev => ({ ...prev, phone: digitsOnly }));
              if (touchedFields.has('phone')) {
                validateField('phone', digitsOnly);
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
        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-5">
          <label className="flex flex-col gap-2" title="Required field">
            <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
              City{' '}
              <abbr title="Required" className="text-lg text-red-600 no-underline">
                *
              </abbr>
            </span>
            <input
              className={`rounded-lg border-2 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:outline-none focus:ring-4 ${
                touchedFields.has('city') && errors.city
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-200'
              }`}
              value={payload.city ?? ''}
              onChange={event => {
                setPayload(prev => ({ ...prev, city: event.target.value }));
                if (touchedFields.has('city')) {
                  validateField('city', event.target.value);
                }
              }}
              onBlur={() => {
                const capitalized = (payload.city ?? '')
                  .trim()
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
                setPayload(prev => ({ ...prev, city: capitalized }));
                handleBlur('city', capitalized);
              }}
              placeholder="Jackson"
              autoComplete="address-level2"
              autoCapitalize="words"
              aria-describedby={contactHelpId}
              aria-invalid={touchedFields.has('city') && !!errors.city}
              required
            />
            {touchedFields.has('city') && errors.city && (
              <span className="text-sm text-red-600" role="alert">{errors.city}</span>
            )}
          </label>
          <label className="flex flex-col gap-2" title="Required field">
            <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
              State{' '}
              <abbr title="Required" className="text-lg text-red-600 no-underline">
                *
              </abbr>
            </span>
            <select
              className={`rounded-lg border-2 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:outline-none focus:ring-4 ${
                touchedFields.has('state') && errors.state
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-200'
              }`}
              value={payload.state ?? ''}
              onChange={event => {
                const value = event.target.value;
                setPayload(prev => ({ ...prev, state: value }));
                if (touchedFields.has('state')) {
                  validateField('state', value);
                }
              }}
              onBlur={() => handleBlur('state', payload.state ?? '')}
              aria-describedby={contactHelpId}
              aria-invalid={touchedFields.has('state') && !!errors.state}
              required
            >
              <option value="">Select a state</option>
              {US_STATES.map(state => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
            {touchedFields.has('state') && errors.state && (
              <span className="text-sm text-red-600" role="alert">{errors.state}</span>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
