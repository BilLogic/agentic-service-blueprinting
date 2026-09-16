// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TranscriptRow } from "@/components/editor/agent/TranscriptRow";

/*
 * The markdown renderer is the app's one lazy chunk, and a tab that outlived a
 * deploy asks for a chunk that is gone. The Suspense fallback covers the wait;
 * this covers the arrival that never comes — the reader still reads the turn,
 * as raw text, instead of watching the row disappear.
 */

vi.mock("@/components/editor/AgentMarkdown", () =>
  Promise.reject(new Error("Failed to fetch dynamically imported module"))
);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("an assistant turn whose markdown chunk never arrives", () => {
  it("renders the raw text", async () => {
    render(
      <TranscriptRow
        event={{ kind: "assistant", text: "A **bold** claim about the lane." }}
      />
    );
    // The Suspense fallback is the same raw text, so waiting for the import
    // to have rejected is what tells the two states apart: the assertion
    // below is about what is on screen AFTER the chunk is known to be gone.
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("markdown renderer unavailable"),
        expect.anything()
      )
    );
    expect(
      await screen.findByText("A **bold** claim about the lane.")
    ).toBeTruthy();
  });
});
