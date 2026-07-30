const test = require('node:test');
const assert = require('node:assert/strict');
const { RiskCalculator } = require('../../srv/lib/risk-calculator');

test('returns low risk when no shortage is expected', () => {
  const calc = new RiskCalculator();
  const result = calc.calculate({
    availableStock: 50,
    reservedStock: 5,
    confirmedIncomingStock: 10,
    demandQuantity: 20,
    safetyStock: 10,
    reorderPoint: 8,
    criticality: 'low'
  });

  assert.equal(result.riskLevel, 'low');
  assert.equal(result.shortageQuantity, 0);
});

test('returns zero projected balance as a critical condition', () => {
  const calc = new RiskCalculator();
  const result = calc.calculate({
    availableStock: 5,
    reservedStock: 0,
    confirmedIncomingStock: 0,
    demandQuantity: 5,
    safetyStock: 10,
    reorderPoint: 8,
    criticality: 'medium'
  });

  assert.equal(result.projectedAvailableQuantity, 0);
  assert.equal(result.riskLevel, 'critical');
});

test('returns a small shortage', () => {
  const calc = new RiskCalculator();
  const result = calc.calculate({
    availableStock: 6,
    reservedStock: 1,
    confirmedIncomingStock: 0,
    demandQuantity: 10,
    safetyStock: 5,
    reorderPoint: 4,
    criticality: 'medium'
  });

  assert.equal(result.shortageQuantity, 5);
  assert.equal(result.riskLevel, 'medium');
});

test('returns critical risk for a severe shortage', () => {
  const calc = new RiskCalculator();
  const result = calc.calculate({
    availableStock: 2,
    reservedStock: 0,
    confirmedIncomingStock: 0,
    demandQuantity: 30,
    safetyStock: 10,
    reorderPoint: 8,
    criticality: 'critical'
  });

  assert.equal(result.shortageQuantity, 28);
  assert.equal(result.riskLevel, 'critical');
});

test('handles missing stock record scenario', () => {
  const calc = new RiskCalculator();
  const result = calc.calculate({
    availableStock: 0,
    reservedStock: 0,
    confirmedIncomingStock: 0,
    demandQuantity: 0,
    safetyStock: 0,
    reorderPoint: 0,
    criticality: 'low'
  });

  assert.equal(result.riskLevel, 'low');
  assert.equal(result.projectedAvailableQuantity, 0);
});

test('rejects invalid material input', () => {
  const calc = new RiskCalculator();
  assert.throws(() => calc.calculate({
    availableStock: -1,
    reservedStock: 0,
    confirmedIncomingStock: 0,
    demandQuantity: 0,
    safetyStock: 0,
    reorderPoint: 0,
    criticality: 'low'
  }), /negative/);
});

test('rejects invalid plant input', () => {
  const calc = new RiskCalculator();
  assert.throws(() => calc.calculate({
    availableStock: 0,
    reservedStock: -1,
    confirmedIncomingStock: 0,
    demandQuantity: 0,
    safetyStock: 0,
    reorderPoint: 0,
    criticality: 'low'
  }), /negative/);
});

test('rejects negative input protection', () => {
  const calc = new RiskCalculator();
  assert.throws(() => calc.calculate({
    availableStock: 10,
    reservedStock: 2,
    confirmedIncomingStock: -1,
    demandQuantity: 0,
    safetyStock: 0,
    reorderPoint: 0,
    criticality: 'low'
  }), /negative/);
});