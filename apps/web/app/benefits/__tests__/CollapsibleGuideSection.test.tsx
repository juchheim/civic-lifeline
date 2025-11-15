"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CollapsibleGuideSection } from "@/components/benefits/CollapsibleGuideSection";

describe("CollapsibleGuideSection", () => {
  it("renders the title and summary while hiding details", () => {
    render(
      <CollapsibleGuideSection id="example" title="Program basics" summary={<p>Summary text</p>}>
        <p>Hidden details</p>
      </CollapsibleGuideSection>,
    );

    expect(screen.getByText("Program basics")).toBeTruthy();
    expect(screen.getByText("Summary text")).toBeTruthy();
    const region = document.getElementById("example");
    expect(region?.getAttribute("aria-hidden")).toBe("true");
    expect(region?.hasAttribute("hidden")).toBe(true);
  });

  it("toggles content visibility when clicking the button", async () => {
    render(
      <CollapsibleGuideSection id="example" title="Program basics">
        <p>Hidden details</p>
      </CollapsibleGuideSection>,
    );
    const user = userEvent.setup();
    const button = screen.getAllByRole("button", { name: /Show details/i })[0]!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const region = document.getElementById("example");
    expect(region?.textContent).toContain("Hidden details");
    const hideButton = screen.getByRole("button", { name: /Hide details/i });
    expect(hideButton).toBeTruthy();
    expect(region?.getAttribute("aria-hidden")).toBe("false");
    expect(region?.hasAttribute("hidden")).toBe(false);
  });
});
