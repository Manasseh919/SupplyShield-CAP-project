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
}