
import test from "node:test";
import assert from "node:assert/strict";

import {
  getAttemptDeadlineState,
} from "../src/services/attemptTimer.service.js";

const now = new Date("2026-10-25T12:00:00.000Z");

test("overall timer: active attempt is not expired", () => {
  const attempt = {
    status: "in_progress",
    timerMode: "overall",
    deadlineAt: new Date("2026-10-25T12:05:00.000Z"),
  };

  assert.deepEqual(
    getAttemptDeadlineState(attempt, now),
    { expired: false, reason: null }
  );
});

test("overall timer: expired deadline is detected", () => {
  const attempt = {
    status: "in_progress",
    timerMode: "overall",
    deadlineAt: new Date("2026-10-25T11:59:00.000Z"),
  };

  assert.deepEqual(
    getAttemptDeadlineState(attempt, now),
    { expired: true, reason: "overall" }
  );
});

test("overall timer: deadline equal to now is expired", () => {
  const attempt = {
    status: "in_progress",
    timerMode: "overall",
    deadlineAt: now,
  };

  assert.deepEqual(
    getAttemptDeadlineState(attempt, now),
    { expired: true, reason: "overall" }
  );
});

test("sectional timer: active section is not expired", () => {
  const attempt = {
    status: "in_progress",
    timerMode: "sectional",
    currentSectionIndex: 0,
    sections: [
      {
        deadlineAt: new Date("2026-10-25T12:05:00.000Z"),
      },
    ],
  };

  assert.deepEqual(
    getAttemptDeadlineState(attempt, now),
    { expired: false, reason: null }
  );
});

test("sectional timer: expired active section is detected", () => {
  const attempt = {
    status: "in_progress",
    timerMode: "sectional",
    currentSectionIndex: 1,
    sections: [
      {
        deadlineAt: new Date("2026-10-25T12:05:00.000Z"),
      },
      {
        deadlineAt: new Date("2026-10-25T11:59:00.000Z"),
      },
    ],
  };

  assert.deepEqual(
    getAttemptDeadlineState(attempt, now),
    { expired: true, reason: "section" }
  );
});

test("submitted attempt is never reported as active expiry", () => {
  const attempt = {
    status: "submitted",
    timerMode: "overall",
    deadlineAt: new Date("2026-10-25T11:00:00.000Z"),
  };

  assert.deepEqual(
    getAttemptDeadlineState(attempt, now),
    { expired: false, reason: null }
  );
});
