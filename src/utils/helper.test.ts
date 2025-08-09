import { calculateSpread } from "./helpers";

describe("calculateSpread", () => {
  it("should calculate spread and percent difference correctly", () => {
    const result = calculateSpread(100, 105);
    expect(result.spread).toBeCloseTo(5);
    expect(result.percentDiff).toBeCloseTo(5);
    expect(result.higherExchange).toBe("LBank");
    expect(result.lowerExchange).toBe("MEXC");
  });

  it("should throw error for non-number inputs", () => {
    expect(() => calculateSpread("100" as any, 105)).toThrow(
      "Prices must be numbers"
    );
  });
});
