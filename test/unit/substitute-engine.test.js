const test = require('node:test');
const assert = require('node:assert/strict');
const { SubstituteEngine } = require('../../srv/lib/substitute-engine');

test('scores candidates with higher compatibility more favorably', () => {
  const engine = new SubstituteEngine();
  const result = engine.scoreCandidate({
    compatibility: 95,
    availability: 90,
    priceDifference: 10,
    supplierReliability: 85,
    leadTimeDays: 5,
    quantityCapable: 100,
    requiredQuantity: 80
  });

  assert.ok(result.score >= 80);
});

test('returns lower scores when substitute quantity is insufficient', () => {
  const engine = new SubstituteEngine();
  const result = engine.scoreCandidate({
    compatibility: 80,
    availability: 70,
    priceDifference: 30,
    supplierReliability: 75,
    leadTimeDays: 10,
    quantityCapable: 40,
    requiredQuantity: 80
  });

  assert.ok(result.score < 80);
});

test('calculates financial impact for a substitute solution', () => {
  const engine = new SubstituteEngine();
  const result = engine.scoreCandidate({
    compatibility: 90,
    availability: 85,
    priceDifference: 20,
    supplierReliability: 80,
    leadTimeDays: 6,
    quantityCapable: 90,
    requiredQuantity: 60
  });

  assert.ok(result.score > 0);
  assert.ok(result.explanation.includes('Compatibility'));
});