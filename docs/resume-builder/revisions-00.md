Recommendations for improving the existing resume builder

Clearer Template Choice – the “Classic/Modern/Minimal” drop‑down is functional but provides no indication of what the templates look like. Small thumbnail previews or descriptions (e.g., “traditional with serif fonts”, “bold headings and colour accents”, etc.) would help users select the right style without extra complexity
civic-lifeline-web.vercel.app
.

Guided Inputs for Low‑literacy Users – many low‑education users may not know what to put in each field. Adding placeholder examples or tooltips explaining what makes a good summary (“mention your strengths, years of experience and the type of job you want”) and bullet points (“use action verbs like ‘served’, ‘organised’, ‘managed’”) would demystify the form
civic-lifeline-web.vercel.app
.

Date Entry Helpers – the Start Date and End Date fields currently accept free‑text strings (e.g., “2021‑06”, “present”). A month‑year picker or drop‑down (Jan 2025, Feb 2025 …) would prevent format errors and make the interface more user‑friendly, especially for users unfamiliar with ISO date formats
civic-lifeline-web.vercel.app
.

Better Skill Input – the skills box uses comma‑separated text. Converting this into a tag‑style entry (each skill becomes a removable “chip”) would visually separate skills and prevent accidental duplicates. Auto‑suggestions could help users discover transferable skills they might not think to list.

Experience/education order and duplication controls – the builder allows adding multiple experiences or education entries, but the default duplication (e.g., “Experience #1” and “Experience #2” both pre‑filled with the same placeholder) can confuse users. Provide an empty template for the first entry and clear instructions to “Add another role” when needed. Drag‑and‑drop reordering would also help emphasise the most recent job first.

AI Summary Feedback – now that the Summary step auto-generates a draft, the blocking loader should clearly explain what’s happening (“Hang tight… takes ~15 seconds”) and reference the data being used (recent role, tenure, top skills, education). After the draft arrives, the helper card should reiterate those inputs and encourage edits. Keep an eye on the **Regenerate summary** button state so users always know when the assistant is busy.
civic-lifeline-web.vercel.app
.

Required Contact Fields – a typical resume needs at least a phone number and location (city, state). Adding optional contact fields (with clear privacy notes) would improve the résumé’s completeness without cluttering the UI.

Responsive Design and Accessibility – ensure all buttons (like “Preview Resume” and “Add Education”) remain visible and active on smaller screens and that they have descriptive ARIA labels. Some buttons were initially hard to click due to being off‑screen; smoother scrolling or floating actions would help.

Generating and reviewing the résumé

I filled out the form on the Resume Builder page with the persona of a low‑income, low‑education user (a Walmart cashier with a high‑school diploma). The Summary step now auto-runs before showing the textarea, so I waited for the loader to finish and then skimmed the generated draft before making any tweaks. After completing the form, I clicked Preview Resume, which opened a PDF preview in a new tab; the Download PDF button then became available for saving. Because downloads are disabled in this environment, I’m unable to open the PDF to inspect it directly; you can find it in your device’s downloads folder. Based on the filled‑in data, the résumé should contain:

Name: James Johnson

Email: james.johnson@example.com

Summary: AI‑refined statement emphasising reliability, cash‑handling skills and eagerness to learn.

Skills: Customer Service, Cash Handling, Food Preparation, Cleaning.

Experience: Cashier at Walmart since June 2021 with bullet‑pointed duties.

Education: High School Diploma (Greenwood High School, 2020).

Please review the downloaded PDF to ensure formatting and information meet your expectations. After making the suggested UI improvements, the résumé builder should be more intuitive and produce higher‑quality résumés for users of all backgrounds.


The Resume PDF:

The PDF is clean and ATS-safe, but it reads very generic and misses a few essentials. Here’s tight, practical feedback you can apply right away.

What’s working

Clear section labels and simple layout (good for ATS).

Action-verb bullets under Experience.

Education listed succinctly.

What to tighten

Contact line is incomplete. Add phone and location (City, ST). Hiring managers often filter by proximity.

Dates are in ISO format. “2021-06 to present” looks machine-generated; switch to “Jun 2021–Present” for human readability. This line appears exactly as: “Cashier, Walmart — 2021-06 to present”. 

resume-classic (4)

Summary is vague. It repeats duties and doesn’t state a goal. The current text mentions cash registers, cleaning, and “seeking entry-level opportunities,” but lacks a target role and proof. 

resume-classic (4)

Bullets are tasks, not results. e.g., “Served customers at checkout,” “Restocked shelves” don’t show impact. 

resume-classic (4)

Skills list is short and undifferentiated. Grouping and a few more relevant terms will help keyword matching (POS, returns, upselling, etc.).

Section order. For early-career candidates, put Skills above Experience so strengths are seen immediately.

Stronger, ready-to-paste replacements

Header (contact)

James Johnson · Greenwood, MS · (555) 123-4567 · james.johnson@example.com


Summary (2–3 sentences)

Reliable customer-service worker with 3+ years as a Walmart cashier. Trusted to handle money accurately, keep lines moving, and keep the area clean and safe. Looking for a full-time Cashier or Customer Service Associate role with steady hours and growth.

Skills (grouped for scanning)

Customer Service · Cash Handling · POS/Register · Returns/Exchanges
Food Prep & Safety · Stocking · Cleaning/Sanitation
Teamwork · Punctuality · Basic Computer Use


Experience (convert tasks → results; adjust numbers to truth)

Cashier — Walmart, Greenwood, MS | Jun 2021–Present
• Process 80–120 transactions per shift; balance cash drawer with 0–1 discrepancies.
• Keep lines moving by greeting customers and resolving basic issues on the spot.
• Restock high-demand items and keep checkout area clean and safe for customers.


Education

High School Diploma — Greenwood High School, Greenwood, MS (2020)


Tip: If you don’t know exact numbers, use safe ranges (“around 80+ transactions”) or frequency (“every shift,” “daily”).

Micro-polish checklist

Use present tense for the current job; past tense for prior jobs.

Keep bullets to 3–5, each starting with an action verb; no periods if they’re sentence fragments (stay consistent).

Align dashes and spacing consistently: “Job — Company | Jun 2021–Present” (em dash between job and company, en dash for date range).

Ensure one font family, one size for body, slightly larger for headings.

Save a copy named with the candidate’s name (e.g., James_Johnson_Resume.pdf).

Why these changes matter for your PDF

Right now, the résumé states duties most employers assume (“served customers… restocked shelves”), which doesn’t separate the candidate from others with similar experience. Adding accuracy, speed, cleanliness, and customer-resolution outcomes gives hiring managers evidence and feeds ATS keywords without fluff. The contact and date fixes address the two most common “fast reject” reasons on entry-level resumes. All suggested edits preserve the simple, ATS-friendly layout you already generated.
