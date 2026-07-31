using { com.supplyshield as db } from '../db/schema';

@(requires: 'authenticated-user')
service SupplyShieldService @(path: '/odata/v4/supply-shield') {

  type RiskCalculation {
    currentAvailableQuantity   : Decimal(13,3);
    projectedAvailableQuantity : Decimal(13,3);
    requiredDemandQuantity    : Decimal(13,3);
    shortageQuantity           : Decimal(13,3);
    safetyStockDeficit         : Decimal(13,3);
    expectedShortageDate       : Date;
    affectedDemandCount        : Integer;
    riskScore                  : Integer;
    riskLevel                  : String;
    explanation                : String;
  }

  type SubstituteCandidate {
    materialSubstituteID : UUID;
    materialNumber       : String;
    description          : String;
    score                : Integer;
    explanation          : String;
  }

  type SimulationResult {
    requestedSubstituteQuantity : Decimal(13,3);
    availableSubstituteQuantity : Decimal(13,3);
    protectedDemand             : Decimal(13,3);
    remainingShortage           : Decimal(13,3);
    currentSolutionCost         : Decimal(13,2);
    substituteSolutionCost      : Decimal(13,2);
    additionalCost              : Decimal(13,2);
    priceIncreasePercentage     : Decimal(5,2);
    estimatedDelay              : Integer;
    requiredApprovalTypes       : String;
    feasibilityStatus           : String;
    warnings                    : String;
  }

  @readonly
  @requires: 'RiskViewer'
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
    isActive
  };

  @requires: 'InventoryPlanner'
  entity Plants as projection on db.Plants {
    key ID,
    plantCode,
    name,
    countryCode,
    timeZone,
    isActive
  };

  @requires: 'InventoryPlanner'
  entity StorageLocations as projection on db.StorageLocations {
    key ID,
    storageLocationCode,
    name,
    plant,
    isActive
  };

  @requires: 'InventoryPlanner'
  entity MaterialStocks as projection on db.MaterialStocks {
    key ID,
    material,
    plant,
    storageLocation,
    stockQuantity,
    availableQuantity,
    lastCountedAt
  };

  @requires: 'InventoryPlanner'
  entity MaterialDemands as projection on db.MaterialDemands {
    key ID,
    material,
    plant,
    demandQuantity,
    demandDate,
    demandSource,
    requestedBy
  };

  @requires: 'ProcurementSpecialist'
  entity Suppliers as projection on db.Suppliers {
    key ID,
    supplierNumber,
    name,
    countryCode,
    isActive
  };

  @requires: 'RiskViewer'
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
    resolvedAt
  };

  @requires: 'RiskViewer'
  entity MaterialSubstitutes as projection on db.MaterialSubstitutes {
    key ID,
    material,
    substituteMaterial,
    substitutionReason,
    approvalStatus,
    effectiveFrom,
    effectiveTo
  };

  // --- ADDED MISSING ENTITY PROJECTIONS ---
  @requires: 'ProcurementSpecialist'
  entity ResolutionProposals as projection on db.ResolutionProposals {
    key ID,
    shortageCase,
    proposedSubstitute,
    proposedQuantity,
    expectedUnitPrice,
    additionalCost,
    priceIncreasePercent,
    leadTimeDays,
    protectedDemandQty,
    remainingShortageQty,
    compatibilityScore,
    overallScore,
    status,
    submittedAt
  };

  @requires: 'RiskViewer'
  entity ApprovalSteps as projection on db.ApprovalSteps {
    key ID,
    proposal,
    approvalType,
    sequence,
    assignedApprover,
    status,
    decisionTime,
    decisionComment
  };

  @requires: 'RiskViewer'
  entity AffectedOrders as projection on db.AffectedOrders {
    key ID,
    shortageCase,
    orderNumber,
    orderType,
    customerPriority,
    affectedQuantity,
    impactDescription
  };

  @requires: 'Administrator'
  entity AuditEntries as projection on db.AuditEntries {
    key ID,
    shortageCase,
    eventType,
    eventDescription,
    createdAt
  };

  // --- ACTIONS & FUNCTIONS ---
  @requires: 'InventoryPlanner'
  action generateShortageCase(
    materialID : UUID,
    plantID : UUID,
    storageLocationID : UUID
  ) returns ShortageCases;

  @requires: 'ProcurementSpecialist'
  action createResolutionProposal(
    caseID : UUID,
    materialSubstituteID : UUID,
    proposedQuantity : Decimal,
    comment : String
  ) returns ResolutionProposals;

  @requires: 'ProcurementSpecialist'
  action submitProposal(
    proposalID : UUID
  ) returns ResolutionProposals;

  @requires: 'EngineeringApprover'
  action approveStep(
    approvalStepID : UUID,
    comment : String
  ) returns ApprovalSteps;

  @requires: 'QualityApprover'
  action rejectStep(
    approvalStepID : UUID,
    reason : String
  ) returns ApprovalSteps;

  @requires: 'InventoryPlanner'
  action assignCase(
    caseID : UUID,
    assignee : String
  ) returns ShortageCases;

  @requires: 'SupplyChainManager'
  action resolveCase(
    caseID : UUID,
    resolutionComment : String
  ) returns ShortageCases;

  @requires: 'SupplyChainManager'
  action reopenCase(
    caseID : UUID,
    reason : String
  ) returns ShortageCases;

  @requires: 'RiskViewer'
  action calculateMaterialRisk(
    materialID : UUID,
    plantID : UUID,
    storageLocationID : UUID
  ) returns RiskCalculation;

  @requires: 'RiskViewer'
  function findSubstituteCandidates(caseID : UUID) returns many SubstituteCandidate;

  @requires: 'RiskViewer'
  action simulateResolution(
    caseID : UUID,
    materialSubstituteID : UUID,
    proposedQuantity : Decimal
  ) returns SimulationResult;
}