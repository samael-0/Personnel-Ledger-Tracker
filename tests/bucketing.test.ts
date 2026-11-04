import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateEmptyBuckets,
  mergeBucketsWithAggregates,
} from "../lib/data/chart-data.ts";

describe("Chart Bucketing and Month Aggregation", () => {
  const refDate = new Date("2026-11-15T12:00:00Z");

  describe("generateEmptyBuckets", () => {
    it("generates 6 consecutive months ending with current month for 6m window", () => {
      const buckets = generateEmptyBuckets("6m", refDate);

      assert.equal(buckets.length, 6);
      assert.equal(buckets[0].periodKey, "2026-06");
      assert.equal(buckets[5].periodKey, "2026-11");
      assert.equal(buckets[5].isCurrent, true);
      assert.equal(buckets[0].isCurrent, false);

      // Verify all default to 0
      for (const b of buckets) {
        assert.equal(b.incomeMinor, 0);
        assert.equal(b.expenseMinor, 0);
        assert.equal(b.netMinor, 0);
      }
    });

    it("generates 12 consecutive months for 12m window", () => {
      const buckets = generateEmptyBuckets("12m", refDate);

      assert.equal(buckets.length, 12);
      assert.equal(buckets[0].periodKey, "2025-12");
      assert.equal(buckets[11].periodKey, "2026-11");
      assert.equal(buckets[11].isCurrent, true);
    });

    it("generates 7 consecutive days for 7d window", () => {
      const buckets = generateEmptyBuckets("7d", refDate);

      assert.equal(buckets.length, 7);
      assert.equal(buckets[0].periodKey, "2026-11-09");
      assert.equal(buckets[6].periodKey, "2026-11-15");
      assert.equal(buckets[6].isCurrent, true);
    });
  });

  describe("mergeBucketsWithAggregates", () => {
    it("correctly merges SQL aggregates onto matching period buckets", () => {
      const empty = generateEmptyBuckets("6m", refDate);
      const sqlResults = [
        { periodKey: "2026-09", incomeMinor: 500000, expenseMinor: 350000 },
        { periodKey: "2026-11", incomeMinor: 600000, expenseMinor: 400000 },
      ];

      const merged = mergeBucketsWithAggregates(empty, sqlResults);

      assert.equal(merged.length, 6);

      const sep = merged.find((b) => b.periodKey === "2026-09");
      assert.ok(sep);
      assert.equal(sep.incomeMinor, 500000);
      assert.equal(sep.expenseMinor, 350000);
      assert.equal(sep.netMinor, 150000); // 500000 - 350000

      const nov = merged.find((b) => b.periodKey === "2026-11");
      assert.ok(nov);
      assert.equal(nov.incomeMinor, 600000);
      assert.equal(nov.expenseMinor, 400000);
      assert.equal(nov.netMinor, 200000);

      // Other months should remain 0
      const oct = merged.find((b) => b.periodKey === "2026-10");
      assert.ok(oct);
      assert.equal(oct.incomeMinor, 0);
      assert.equal(oct.expenseMinor, 0);
      assert.equal(oct.netMinor, 0);
    });

    it("correctly calculates negative net flow", () => {
      const empty = generateEmptyBuckets("6m", refDate);
      const sqlResults = [
        { periodKey: "2026-10", incomeMinor: 100000, expenseMinor: 250000 },
      ];

      const merged = mergeBucketsWithAggregates(empty, sqlResults);
      const oct = merged.find((b) => b.periodKey === "2026-10");
      assert.ok(oct);
      assert.equal(oct.netMinor, -150000); // 100000 - 250000
    });
  });
});

