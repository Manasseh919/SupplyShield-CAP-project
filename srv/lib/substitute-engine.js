class SubstituteEngine {
  constructor(config = {}) {
    this.config = {
      compatibilityWeight: 0.35,
      availabilityWeight: 0.25,
      priceWeight: 0.20,
      reliabilityWeight: 0.10,
      leadTimeWeight: 0.10,
      ...config
    };
  }

  scoreCandidate({
    compatibility = 0,
    availability = 0,
    priceDifference = 0,
    supplierReliability = 0,
    leadTimeDays = 0,
    quantityCapable = 0,
    requiredQuantity = 0
  }) {
    const normalizedCompatibility = Math.max(0, Math.min(100, compatibility));
    const normalizedAvailability = Math.max(0, Math.min(100, availability));
    const normalizedReliability = Math.max(0, Math.min(100, supplierReliability));

    const priceScore = Math.max(0, 100 - Math.min(priceDifference, 100));
    const leadTimeScore = Math.max(0, 100 - Math.min(leadTimeDays * 2, 100));

    const coverageScore = quantityCapable >= requiredQuantity ? 100 : Math.max(0, Math.round((quantityCapable / requiredQuantity) * 100));

    const rawScore =
      normalizedCompatibility * this.config.compatibilityWeight +
      normalizedAvailability * this.config.availabilityWeight +
      priceScore * this.config.priceWeight +
      normalizedReliability * this.config.reliabilityWeight +
      leadTimeScore * this.config.leadTimeWeight;

    const score = Math.round(rawScore);

    return {
      score,
      coverageScore,
      explanation: [
        `Compatibility ${normalizedCompatibility}`,
        `Availability ${normalizedAvailability}`,
        `Price impact ${priceScore}`,
        `Supplier reliability ${normalizedReliability}`,
        `Lead time ${leadTimeScore}`
      ].join('; ')
    };
  }
}

module.exports = {
  SubstituteEngine
};