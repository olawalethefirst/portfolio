import { expect, it } from "vitest";
import { ApiRequestError } from "@/src/api/client";
import { saveErrorMessage } from "./issue-feedback";

const serverFailure = new ApiRequestError("server", 422, {
  code: "VALIDATION_ERROR",
  message: "Check the highlighted fields.",
});

it("reports a lost response as unconfirmed rather than failed", () => {
  expect(saveErrorMessage(new ApiRequestError("network", null), [])).toBe(
    "Couldn’t confirm the save.",
  );
  expect(saveErrorMessage(new ApiRequestError("response", 200), [])).toBe(
    "Couldn’t confirm the save.",
  );
});

it("keeps a server failure's own message and appends unmatched issues", () => {
  expect(saveErrorMessage(serverFailure, [])).toBe(
    "Check the highlighted fields.",
  );
  expect(saveErrorMessage(serverFailure, ["Review content", "Another"])).toBe(
    "Check the highlighted fields. Review content Another",
  );
});

it("uses a plain error's message", () => {
  expect(saveErrorMessage(new Error("Save failed"), ["Extra"])).toBe(
    "Save failed Extra",
  );
});
