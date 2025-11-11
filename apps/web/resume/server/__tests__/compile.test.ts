import { describe, expect, it, vi } from 'vitest';

const templates = vi.hoisted(() => {
  const baseTemplate = `<!DOCTYPE html>
<html>
  <body class="template-{{templateName}}">
    <h1>{{name}}</h1>
    <p class="summary">{{summary}}</p>
    {{#if skills}}
      <ul class="skills">{{#each skills}}<li>{{this}}</li>{{/each}}</ul>
    {{/if}}
    {{#if experience}}
      <ul class="experience">
        {{#each experience}}
          <li>{{title}} @ {{company}}{{#with (formatTimelineRange startDate endDate) as |timeline|}}{{#if timeline}} — {{timeline}}{{/if}}{{/with}}
            {{#if bullets}}<ul>{{#each bullets}}<li>{{this}}</li>{{/each}}</ul>{{/if}}
          </li>
        {{/each}}
      </ul>
    {{/if}}
  </body>
</html>`;
  return {
    baseTemplate,
  };
});

vi.mock('../templates/classic.hbs', () => ({ default: templates.baseTemplate }));
vi.mock('../templates/modern.hbs', () => ({ default: templates.baseTemplate }));
vi.mock('../templates/minimal.hbs', () => ({ default: templates.baseTemplate }));
vi.mock('../templates/partials/head.hbs', () => ({ default: '' }));
vi.mock('../templates/partials/tokens-css.hbs', () => ({ default: '' }));

import { compileTemplate } from '../compile';
import type { ResumePayload } from '../validation';

const BASE_PAYLOAD: ResumePayload = {
  name: 'Jordan Example',
  email: 'jordan@example.com',
  phone: '5551234567',
  location: 'Springfield, IL',
  summary: 'Experienced retail associate focused on customer satisfaction.',
  skills: ['Customer service'],
  experience: [
    {
      title: 'Sales Associate',
      company: 'Retailers & Co',
      startDate: '2020-01',
      endDate: '2021-02',
      bullets: ['Assisted over 100 shoppers per day.'],
    },
  ],
  education: [
    {
      degree: 'B.A. Communications',
      school: 'State University',
      graduationYear: '2018',
    },
  ],
  links: [
    {
      label: 'Portfolio',
      url: 'https://example.com',
    },
  ],
};

describe('resume template compilation', () => {
  it('escapes untrusted resume content', () => {
    const maliciousPayload: ResumePayload = {
      ...BASE_PAYLOAD,
      name: '<script>alert("x")</script>',
      summary: 'Loves using <b>bold</b> statements & risky tags.',
      skills: ['<img src=x onerror="alert(1)">'],
      experience: [
        {
          title: 'Support <script>Engineer</script>',
          company: 'Helpers <Co>',
          startDate: '2022-01',
          endDate: '2022-12',
          bullets: ['Closed tickets with <strong>speed</strong>.'],
        },
      ],
      education: [
        {
          degree: 'B.S. "Cyber"',
          school: 'Security <Academy>',
        },
      ],
      links: [
        {
          label: 'Blog <cool>',
          url: 'https://example.com/blog',
        },
      ],
    };

    const html = compileTemplate('classic', maliciousPayload);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Loves using &lt;b&gt;bold&lt;/b&gt; statements &amp; risky tags.');
    expect(html).toContain('&lt;img src&#x3D;x onerror&#x3D;&quot;alert(1)&quot;&gt;');
    expect(html).toContain('Support &lt;script&gt;Engineer&lt;/script&gt;');
    expect(html).toContain('Helpers &lt;Co&gt;');
    expect(html).toContain('Closed tickets with &lt;strong&gt;speed&lt;/strong&gt;.');
  });

  it('renders timeline ranges with an en dash and escaped content', () => {
    const html = compileTemplate('classic', BASE_PAYLOAD);

    expect(html).toContain('Sales Associate');
    expect(html).toContain('Retailers &amp; Co');
    expect(html).toContain('Jan 2020–Feb 2021');
  });
});
