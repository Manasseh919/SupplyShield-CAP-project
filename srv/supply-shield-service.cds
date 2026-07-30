using { com.supplyshield as db } from '../db/schema';

service SupplyShieldService @(path: '/odata/v4/supply-shield') {

  @readonly
  entity Materials as projection on db.Materials {
    key ID,
    materialNumber,
    description,
    materialGroup,
    baseUnit,
    criticality,
    safetyStock,
    reorderPoint,
    standardPrice,
    currencyCode,
    isActive,
    supplierMaterials,
    materialStocks,
    demands,
    substitutesFrom,
    substitutesTo
  };

  @readonly
  entity Plants as projection on db.Plants {
    key ID,
    plantCode,
    name,
    countryCode,
    timeZone,
    isActive,
    storageLocations
  };

  @readonly
  entity StorageLocations as projection on db.StorageLocations {
    key ID,
    storageLocationCode,
    name,
    plant,
    isActive
  };

  @readonly
  entity MaterialStocks as projection on db.MaterialStocks {
    key ID,
    material,
    plant,
    storageLocation,
    stockQuantity,
    availableQuantity,
    lastCountedAt
  };

  @readonly
  entity MaterialDemands as projection on db.MaterialDemands {
    key ID,
    material,
    plant,
    demandQuantity,
    demandDate,
    demandSource,
    requestedBy
  };

  @readonly
  entity Suppliers as projection on db.Suppliers {
    key ID,
    supplierNumber,
    name,
    countryCode,
    isActive,
    supplierMaterials
  };

  @readonly
  entity MaterialSubstitutes as projection on db.MaterialSubstitutes {
    key ID,
    material,
    substituteMaterial,
    substitutionReason,
    approvalStatus,
    effectiveFrom,
    effectiveTo
  };

  @readonly
  entity ShortageCases as projection on db.ShortageCases {
    key ID,
    caseNumber,
    material,
    plant,
    storageLocation,
    status,
    riskLevel,
    shortageQuantity,
    projectedAvailableQuantity,
    expectedShortageDate,
    requiredResolutionDate,
    estimatedFinancialImpact,
    currencyCode,
    rootCause,
    assignedTo,
    detectedAt,
    resolvedAt,
    affectedOrders,
    proposals,
    comments,
    auditEntries
  };

  entity ResolutionProposals as projection on db.ResolutionProposals;
  entity ApprovalSteps as projection on db.ApprovalSteps;

  type RiskCalculation {
    currentAvailableQuantity : Decimal(13,3);
    projectedAvailableQuantity : Decimal(13,3);
    requiredDemandQuantity : Decimal(13,3);
    shortageQuantity : Decimal(13,3);
    safetyStockDeficit : Decimal(13,3);
    expectedShortageDate : Date;
    affectedDemandCount : Integer;
    riskScore : Integer;
    riskLevel : String;
    explanation : String;
  }

  action calculateMaterialRisk(
    materialID : UUID,
    plantID : UUID,
    storageLocationID : UUID
  ) returns RiskCalculation;

  action generateShortageCase(
    materialID : UUID,
    plantID : UUID,
    storageLocationID : UUID
  ) returns ShortageCases;

  type SubstituteCandidate {
    materialSubstituteID : UUID;
    materialNumber : String;
    description : String;
    score : Integer;
    explanation : String;
  }

  type SimulationResult {
    requestedSubstituteQuantity : Decimal(13,3);
    availableSubstituteQuantity : Decimal(13,3);
    protectedDemand : Decimal(13,3);
    remainingShortage : Decimal(13,3);
    currentSolutionCost : Decimal(13,2);
    substituteSolutionCost : Decimal(13,2);
    additionalCost : Decimal(13,2);
    priceIncreasePercentage : Decimal(5,2);
    estimatedDelay : Integer;
    requiredApprovalTypes : String;
    feasibilityStatus : String;
    warnings : String;
  }

  function findSubstituteCandidates(caseID : UUID) returns many SubstituteCandidate;

  action simulateResolution(
    caseID : UUID,
    materialSubstituteID : UUID,
    proposedQuantity : Decimal
  ) returns SimulationResult;

  action createResolutionProposal(
    caseID : UUID,
    materialSubstituteID : UUID,
    proposedQuantity : Decimal,
    comment : String
  ) returns ResolutionProposals;

  action submitProposal(
    proposalID : UUID
  ) returns ResolutionProposals;

  action approveStep(
    approvalStepID : UUID,
    comment : String
  ) returns ApprovalSteps;

  action rejectStep(
    approvalStepID : UUID,
    reason : String
  ) returns ApprovalSteps;
}