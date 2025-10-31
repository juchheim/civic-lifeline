PROMPT 05 — Playwright install & smoke test (local)

Include the curl command and expected headers: 200, application/pdf, Content-Disposition: attachment; filename="resume-<template>.pdf".

Run the Playwright install step you configured (or simulate if you can’t run commands).

Create a sample payload file at `apps/web/resume/fixtures/resume-sample.json` with:
{
  "name": "Ernest Juchheim",
  "email": "ernest@example.com",
  "phone": "(555) 555-5555",
  "location": "Yazoo City, MS",
  "summary": "Front-end developer focused on accessible civic apps.",
  "skills": ["React", "Node.js", "TypeScript", "Playwright"],
  "experience": [
    { "title": "Web Developer", "company": "Civic Lifeline", "years": "2023 – Present", "bullets": ["Built unemployment visualizations", "Integrated server-side PDF generation"] }
  ],
  "education": [{ "degree": "B.S. Computer Science", "school": "MS State" }],
  "links": [{ "label": "GitHub", "url": "https://github.com/ernest" }]
}

Add a tiny script `apps/web/resume/scripts/smoke-test.http` (or curl instructions) to POST:
POST http://localhost:3000/api/pdf?template=modern
Content-Type: application/json
< ../fixtures/resume-sample.json

Acceptance:
- Show the exact curl command (or REST client snippet) to test.
- State the expected HTTP 200 with `application/pdf` and a file size > 1KB.
Stop and wait.
