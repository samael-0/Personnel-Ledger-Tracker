import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, parseToMinorUnits, getCurrencyMeta } from "../lib/money.ts";

describe("Money Utilities", () => {
  describe("formatMoney", () => {
    it("formats standard USD amounts correctly", () => {
      assert.equal(formatMoney(1499, "USD"), "$14.99");
      assert.equal(formatMoney(0, "USD"), "$0.00");
      assert.equal(formatMoney(5, "USD"), "$0.05");
      assert.equal(formatMoney(100, "USD"), "$1.00");
    });

    it("formats negative amounts with a minus sign", () => {
      assert.equal(formatMoney(-1499, "USD"), "-$14.99");
      assert.equal(formatMoney(-50, "USD"), "-$0.50");
    });

    it("formats large amounts with thousands separators", () => {
      assert.equal(formatMoney(100000000, "USD"), "$1,000,000.00");
      assert.equal(formatMoney(25000050, "EUR"), "€250,000.50");
    });

    it("formats 0-decimal currencies (JPY) without cents", () => {
      assert.equal(formatMoney(1500, "JPY"), "¥1,500");
      assert.equal(formatMoney(0, "JPY"), "¥0");
      assert.equal(formatMoney(-750, "JPY"), "-¥750");
    });

    it("supports various currency symbols and codes", () => {
      assert.equal(formatMoney(10000, "GBP"), "£100.00");
      assert.equal(formatMoney(50000, "NPR"), "Rs.500.00");
      assert.equal(formatMoney(10000, "USD", true), "$100.00 USD");
    });

    it("handles non-integer minor unit inputs safely without corrupted fractions", () => {
      assert.equal(formatMoney(1499.4, "USD"), "$14.99");
      assert.equal(formatMoney(1499.9, "USD"), "$15.00");
    });
  });

  describe("parseToMinorUnits", () => {
    it("parses decimal string representations into integer minor units", () => {
      assert.equal(parseToMinorUnits("14.99", "USD"), 1499);
      assert.equal(parseToMinorUnits("0.05", "USD"), 5);
      assert.equal(parseToMinorUnits("100", "USD"), 10000);
      assert.equal(parseToMinorUnits("$1,250.75", "USD"), 125075);
    });

    it("handles numeric inputs directly", () => {
      assert.equal(parseToMinorUnits(14.99, "USD"), 1499);
      assert.equal(parseToMinorUnits(0, "USD"), 0);
    });

    it("handles 0-decimal currencies (JPY) correctly", () => {
      assert.equal(parseToMinorUnits("500", "JPY"), 500);
      assert.equal(parseToMinorUnits(500, "JPY"), 500);
    });

    it("handles empty or invalid strings gracefully", () => {
      assert.equal(parseToMinorUnits("", "USD"), 0);
      assert.equal(parseToMinorUnits("abc", "USD"), 0);
    });
  });

  describe("getCurrencyMeta", () => {
    it("returns correct metadata for supported currencies", () => {
      const usd = getCurrencyMeta("usd");
      assert.equal(usd.code, "USD");
      assert.equal(usd.symbol, "$");
      assert.equal(usd.decimals, 2);

      const jpy = getCurrencyMeta("JPY");
      assert.equal(jpy.code, "JPY");
      assert.equal(jpy.decimals, 0);
    });

    it("provides fallback for unknown currencies", () => {
      const unknown = getCurrencyMeta("XYZ");
      assert.equal(unknown.code, "XYZ");
      assert.equal(unknown.decimals, 2);
    });
  });
});

