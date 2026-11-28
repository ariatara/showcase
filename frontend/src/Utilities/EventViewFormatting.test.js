import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { eventDate, eventTime, safeMapLink } from "./EventViewFormatting.js";

test("event dates remain stable across time zones and invalid values stay empty", () => {
  for (const timezone of ["Pacific/Honolulu", "Pacific/Kiritimati"]) {
    process.env.TZ = timezone;
    assert.match(eventDate("2026-04-01"), /April 1, 2026/);
  }
  assert.equal(eventDate("2026-02-30"), "");
  assert.equal(eventDate(null), "");
  assert.equal(eventTime("25:00"), "");
  assert.match(eventTime("13:05:00"), /1:05.*PM/);
  assert.equal(safeMapLink("javascript:alert(1)"), "");
  assert.equal(safeMapLink("https://maps.example.com/"), "https://maps.example.com/");
});
