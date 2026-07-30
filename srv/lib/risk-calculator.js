class RiskCalculator {
    constructor(config = {}) {
        this.config = {
            defaultHorizonDays: 7,
            shortageThreshold: 0,
            criticalThreshold: 20,
            highThreshold: 10,
            mediumThreshold: 5,
            ...config
        };
    }

  calculate({
    availableStock = 0,
    reservedStock = 0,
    confirmedIncomingStock = 0,
    demandQuantity = 0,
    safetyStock = 0,
    reorderPoint = 0,
    criticality = 'medium',
    horizonDays = this.config.defaultHorizonDays
  }) {
    if (
      availableStock < 0 ||
      reservedStock < 0 ||
      confirmedIncomingStock < 0 ||
      demandQuantity < 0 ||
      safetyStock < 0 ||
      reorderPoint < 0
    ) {
      throw new Error('Risk inputs must not be negative');
    }

    const netAvailable = availableStock + confirmedIncomingStock - reservedStock;
    const projectedAvailable = netAvailable - demandQuantity;

    const requiredDemand = Math.max(0, demandQuantity - netAvailable);
    const shortageQuantity = Math.max(0, -projectedAvailable);
    const safetyStockDeficit = Math.max(0, safetyStock - projectedAvailable);

    let riskScore = 0;

    if (shortageQuantity > 0) {
      riskScore += 35;
    }

    if (shortageQuantity >= 20) {
      riskScore += 25;
    } else if (shortageQuantity >= 10) {
      riskScore += 15;
    }

    if (projectedAvailable <= 0 && shortageQuantity > 0) {
      // no extra points here to prevent over-scoring small shortages
    }

    if (safetyStockDeficit > 0) {
      riskScore += 10;
    }

    if (criticality === 'critical') {
      riskScore += 20;
    } else if (criticality === 'high') {
      riskScore += 10;
    }

    let riskLevel = 'low';

    // Zero projected balance with no net shortage is a critical condition
    if (projectedAvailable <= 0 && demandQuantity > 0 && shortageQuantity === 0) {
      riskLevel = 'critical';
    } else if (riskScore >= 70) {
      riskLevel = 'critical';
    } else if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 20 || shortageQuantity > 0) {
      riskLevel = 'medium';
    }

    const explanation = [
      `Projected available stock is ${projectedAvailable}`,
      `Demand considered is ${demandQuantity}`,
      `Safety stock deficit is ${safetyStockDeficit}`,
      `Material criticality is ${criticality}`
    ].join('. ');

    return {
      currentAvailableQuantity: availableStock,
      projectedAvailableQuantity: projectedAvailable,
      requiredDemandQuantity: requiredDemand,
      shortageQuantity,
      safetyStockDeficit,
      expectedShortageDate: null,
      affectedDemandCount: demandQuantity > 0 ? 1 : 0,
      riskScore,
      riskLevel,
      explanation
    };
  }
}

module.exports = {
    RiskCalculator
};