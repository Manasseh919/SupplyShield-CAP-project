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
        if (availableStock < 0 || reservedStock < 0 || confirmedIncomingStock < 0 || demandQuantity < 0 || safetyStock < 0 || reorderPoint < 0) {
            throw new Error('Risk inputs must not be negative');
        }

        const projectedAvailable = availableStock + confirmedIncomingStock - reservedStock - demandQuantity;
        const requiredDemand = Math.max(0, demandQuantity - (availableStock + confirmedIncomingStock - reservedStock));
        const shortageQuantity = Math.max(0, requiredDemand);
        const safetyStockDeficit = Math.max(0, safetyStock - projectedAvailable);
        const affectedDemandCount = demandQuantity > 0 ? 1 : 0;

        let riskScore = 0;
        if (projectedAvailable <= 0) {
            riskScore += 60;
        } else if (projectedAvailable < safetyStock) {
            riskScore += 30;
        }

        if (shortageQuantity > 0) {
            riskScore += 20;
        }

        if (safetyStockDeficit > 0) {
            riskScore += 10;
        }

        if (criticality === 'critical') {
            riskScore += 20;
        } else if (criticality === 'high') {
            riskScore += 10;
        }

        if (horizonDays > 7) {
            riskScore += 5;
        }

        let riskLevel = 'low';
        if (riskScore >= 70) riskLevel = 'critical';
        else if (riskScore >= 45) riskLevel = 'high';
        else if (riskScore >= 25) riskLevel = 'medium';

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
            affectedDemandCount,
            riskScore,
            riskLevel,
            explanation
        };
    }
}

module.exports = {
    RiskCalculator
};