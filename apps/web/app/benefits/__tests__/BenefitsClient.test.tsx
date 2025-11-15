"use client";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import BenefitsClient from "../BenefitsClient";
import { BenefitsLocationProvider } from "../useBenefitsLocation";

class MockObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

function renderBenefitsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BenefitsLocationProvider>
        <BenefitsClient />
      </BenefitsLocationProvider>
    </QueryClientProvider>,
  );
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  const position = first.compareDocumentPosition(second);
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe("BenefitsClient", () => {
  beforeAll(() => {
    vi.stubGlobal("IntersectionObserver", MockObserver);
    vi.stubGlobal("ResizeObserver", MockObserver);
    window.HTMLElement.prototype.scrollIntoView = () => {};
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(() => {
    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/benefits/state-social-security")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            stats: {
              stateCode: "MS",
              stateName: "Mississippi",
              totalPopulation: 2_959_500,
              totalReceivingBenefits: 620_200,
              shareReceivingBenefits: 0.2,
              total65Plus: 400_100,
              total65PlusReceivingBenefits: 320_300,
              share65PlusReceivingBenefits: 0.8,
              year: 2015,
            },
            source: "Test Source",
            lastUpdated: "2020-01-01T00:00:00.000Z",
            dataVintage: "2015",
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    });
    window.print = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reveals guidance headings after expanding a program basics section", async () => {
    renderBenefitsPage();
    const user = userEvent.setup();
    const panel = document.getElementById("benefit-section-food-money");
    expect(panel).toBeTruthy();
    const toggle = within(panel!).getByRole("button", { name: /Show details/i });
    expect(document.getElementById("food-program-basics")).toHaveAttribute("aria-hidden", "true");
    await user.click(toggle);
    expect(document.getElementById("food-program-basics")).toHaveAttribute("aria-hidden", "false");
    expect(within(panel!).getByText(/What this can help with/i)).toBeInTheDocument();
  });

  it("renders a single page heading and four section headings", () => {
    renderBenefitsPage();
    const h1 = screen.getByRole("heading", { level: 1, name: /Benefits help in plain language/i });
    expect(h1).toBeTruthy();
    const h2Headings = screen.getAllByRole("heading", { level: 2 });
    expect(h2Headings).toHaveLength(4);
  });

  it("shows the summary box with key points", () => {
    renderBenefitsPage();
    const headings = screen.getAllByText(/What this page can help you with/i);
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByText("See how many people near you have health coverage or get Social Security.")).toBeTruthy();
    expect(
      screen.getByText("You do not apply for benefits on this page. We help you understand your options and find the right places to go."),
    ).toBeTruthy();
  });

  it("orders the summary, pills, and location prompt", () => {
    renderBenefitsPage();
    const summaryHeading = screen.getByRole("heading", { name: /What this page can help you with/i });
    const stepOne = screen.getByText(/Step 1: Pick a benefit area/i);
    const stepTwo = screen.getByText(/Step 2: Add your city or ZIP/i);
    expectBefore(summaryHeading, stepOne);
    expectBefore(stepOne, stepTwo);
  });

  it("renders the jump nav for all sections", () => {
    renderBenefitsPage();
    const nav = screen.getAllByLabelText(/Quick benefits navigation/i)[0]!;
    const buttons = within(nav).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    const labels = buttons.map((button) => button.textContent?.trim());
    expect(labels).toEqual(["Food & Money", "Health", "Bills & Housing", "Social Security"]);
  });

  it("renders learn more links with external targets", () => {
    renderBenefitsPage();
    const learnMoreHeadings = screen.getAllByRole("heading", { name: /Learn more \(official sites\)/i });
    expect(learnMoreHeadings).toHaveLength(4);
    learnMoreHeadings.forEach((heading) => {
      const list = heading.nextElementSibling;
      expect(list?.tagName).toBe("UL");
      const externalLinks = list?.querySelectorAll('a[target="_blank"]') ?? [];
      expect(externalLinks.length).toBeGreaterThan(0);
      externalLinks.forEach((link) => {
        expect(link.getAttribute("rel") ?? "").toContain("noreferrer");
      });
    });
  });

  it("shows category toggles for local food, WIC, and cash help", () => {
    renderBenefitsPage();
    expect(screen.getByRole("button", { name: /SNAP food help/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /WIC for moms/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cash help for bills/i })).toBeInTheDocument();
  });

  it("allows jumping to other sections via the quick nav", async () => {
    renderBenefitsPage();
    const user = userEvent.setup();
    const jumpNav = screen.getAllByLabelText(/Quick benefits navigation/i)[0]!;
    const jumpButton = within(jumpNav).getAllByRole("button", { name: /^Health$/i })[0]!;
    await user.click(jumpButton);
    const healthPanelButton = document.getElementById("benefit-trigger-health-coverage");
    expect(healthPanelButton?.getAttribute("aria-expanded")).toBe("true");
  });

  it("calls window.print when using the print button", async () => {
    renderBenefitsPage();
    const user = userEvent.setup();
    const [printButton] = screen.getAllByRole("button", { name: /Print this section/i });
    await user.click(printButton);
    expect(window.print).toHaveBeenCalled();
  });

  it("renders American Job Center links", async () => {
    renderBenefitsPage();
    const links = await screen.findAllByRole("link", { name: /American Job Center/i });
    expect(links.length).toBeGreaterThanOrEqual(4);
    links.forEach((link) =>
      expect(link.getAttribute("href")).toBe("https://www.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx"),
    );
  });

  it("opens and closes the disclaimer modal", async () => {
    renderBenefitsPage();
    const user = userEvent.setup();
    const [trigger] = screen.getAllByRole("button", { name: /Important notes about this page/i });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/You do not apply here/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has program basics sections collapsed by default and shows details when toggled", async () => {
    renderBenefitsPage();
    const ids = [
      { panelId: "food-money", contentId: "food-program-basics" },
      { panelId: "health-coverage", contentId: "health-program-basics" },
      { panelId: "daily-support", contentId: "daily-support-program-basics" },
      { panelId: "security-disability", contentId: "security-program-basics" },
    ];
    const user = userEvent.setup();
    for (const { panelId, contentId } of ids) {
      const panel = document.getElementById(`benefit-section-${panelId}`);
      expect(panel).toBeTruthy();
      const details = document.getElementById(contentId);
      expect(details).toHaveAttribute("aria-hidden", "true");
      const button = within(panel!).getByRole("button", { name: /Show details/i });
      await user.click(button);
      expect(document.getElementById(contentId)).toHaveAttribute("aria-hidden", "false");
      await user.click(button);
      expect(document.getElementById(contentId)).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("shows local metrics before program basics inside each panel", async () => {
    renderBenefitsPage();
    const user = userEvent.setup();
    const assertPanelOrder = async (panelId: string, helperHeading: RegExp, contentId: string) => {
      const panel = document.getElementById(`benefit-section-${panelId}`);
      expect(panel).toBeTruthy();
      const helper = within(panel!).getByRole("heading", { name: helperHeading });
      const toggle = within(panel!).getByRole("button", { name: /Show details/i });
      if (document.getElementById(contentId)?.getAttribute("aria-hidden") === "true") {
        await user.click(toggle);
      }
      const basics = within(panel!).getAllByText(/What this can help with/i)[0]!;
      expectBefore(helper, basics);
    };

    await assertPanelOrder("food-money", /Local food, WIC, and cash helpers/i, "food-program-basics");
    await assertPanelOrder("health-coverage", /Health coverage in your area/i, "health-program-basics");
    await assertPanelOrder("daily-support", /Rent and housing help/i, "daily-support-program-basics");
    await assertPanelOrder("security-disability", /Social Security and disability checks/i, "security-program-basics");
  });

  it("keeps program basics toggles accessible", () => {
    renderBenefitsPage();
    const buttons = screen.getAllByRole("button", { name: /Show details/i });
    buttons.forEach((button) => {
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(button.getAttribute("aria-controls")).toBeTruthy();
    });
  });
});
