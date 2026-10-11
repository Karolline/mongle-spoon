import { describe, expect, it } from "vitest";
import { dateKo, daysAgoKo, todayLocal } from "./format";

describe("todayLocal", () => {
  it("uses the device's calendar date, zero-padded", () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayLocal(new Date(2026, 9, 11, 0, 1))).toBe("2026-10-11");
  });
});

describe("dateKo", () => {
  it("writes the date in Korean", () => {
    expect(dateKo("2026-10-01")).toBe("2026년 10월 1일");
    expect(dateKo("nope")).toBe("");
  });
});

describe("daysAgoKo", () => {
  const today = "2026-10-11";

  it.each([
    ["2026-10-11", "오늘"],
    ["2026-10-10", "어제"],
    ["2026-10-08", "3일 전"],
    ["2026-10-05", "6일 전"],
    ["2026-10-04", "1주 전"],
    ["2026-09-20", "3주 전"],
    ["2026-09-01", "9월 1일"],
    ["2025-12-31", "2025년 12월 31일"],
    // A day after today (e.g. recorded in another time zone) shows the date.
    ["2026-10-12", "10월 12일"],
  ])("%s is %s", (day, expected) => {
    expect(daysAgoKo(day, today)).toBe(expected);
  });

  it("counts across months and years", () => {
    expect(daysAgoKo("2026-09-30", "2026-10-01")).toBe("어제");
    expect(daysAgoKo("2025-12-31", "2026-01-01")).toBe("어제");
  });
});
