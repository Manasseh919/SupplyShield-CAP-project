namespace com.supplyshield;

using { cuid, managed } from '@sap/cds/common';
using { com.supplyshield.MaterialCriticality as MaterialCriticality } from './types';

@assert.unique: { uniquePlantCode: [plantCode] }
entity Plants : cuid, managed {
  plantCode        : String(4)   @mandatory;
  name             : String(100) @mandatory;
  countryCode      : String(2)   @mandatory;
  timeZone         : String(50);
  isActive         : Boolean default true;
  storageLocations : Association to many StorageLocations
                       on storageLocations.plant = $self;
}

@assert.unique: { uniquePlantStorageLocation: [plant, storageLocationCode] }
entity StorageLocations : cuid, managed {
  storageLocationCode : String(4)   @mandatory;
  name                : String(100) @mandatory;
  plant               : Association to Plants;
  isActive            : Boolean default true;
  materialStocks      : Association to many MaterialStocks
                          on materialStocks.storageLocation = $self;
}

@assert.unique: { uniqueMaterialNumber: [materialNumber] }
entity Materials : cuid, managed {
  materialNumber    : String(18)  @mandatory;
  description       : String(200) @mandatory;
  materialGroup     : String(20);
  baseUnit          : String(3)   @mandatory;
  criticality       : MaterialCriticality default 'medium';
  safetyStock       : Decimal(13,3) @assert.range: [0, 999999999999.999];
  reorderPoint      : Decimal(13,3) @assert.range: [0, 999999999999.999];
  standardPrice     : Decimal(13,2) @assert.range: [0, 999999999999.99];
  currencyCode      : String(3)   @mandatory;
  isActive          : Boolean default true;

  supplierMaterials : Association to many SupplierMaterials
                         on supplierMaterials.material = $self;
  materialStocks    : Association to many MaterialStocks
                         on materialStocks.material = $self;
  demands           : Association to many MaterialDemands
                         on demands.material = $self;
  substitutesFrom   : Association to many MaterialSubstitutes
                         on substitutesFrom.material = $self;
  substitutesTo     : Association to many MaterialSubstitutes
                         on substitutesTo.substituteMaterial = $self;
}

@assert.unique: { uniqueSupplierNumber: [supplierNumber] }
entity Suppliers : cuid, managed {
  supplierNumber    : String(10)  @mandatory;
  name              : String(200) @mandatory;
  countryCode       : String(2);
  isActive          : Boolean default true;

  supplierMaterials : Association to many SupplierMaterials
                         on supplierMaterials.supplier = $self;
}

entity SupplierMaterials : cuid, managed {
  supplier     : Association to Suppliers;
  material     : Association to Materials;
  leadTimeDays : Integer @assert.range: [0, 365];
  isPreferred  : Boolean default false;
  isActive     : Boolean default true;
}

entity MaterialStocks : cuid, managed {
  material          : Association to Materials;
  plant             : Association to Plants;
  storageLocation   : Association to StorageLocations;
  stockQuantity     : Decimal(13,3) @assert.range: [0, 999999999999.999];
  availableQuantity : Decimal(13,3) @assert.range: [0, 999999999999.999];
  lastCountedAt     : Timestamp;
}

entity MaterialDemands : cuid, managed {
  material       : Association to Materials;
  plant          : Association to Plants;
  demandQuantity : Decimal(13,3) @assert.range: [0, 999999999999.999];
  demandDate     : Date;
  demandSource   : String(50);
  requestedBy    : String(100);
}

entity MaterialSubstitutes : cuid, managed {
  material           : Association to Materials;
  substituteMaterial : Association to Materials;
  substitutionReason : String(200);
  approvalStatus     : String(30) default 'pending';
  effectiveFrom      : Date;
  effectiveTo        : Date;
}