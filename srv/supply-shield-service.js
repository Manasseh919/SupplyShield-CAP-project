const cds = require('@sap/cds');
const { RiskCalculator } = require('./lib/risk-calculator');
const config = require('./lib/risk-config');

module.exports = cds.service.impl(async function() {
  const { Materials, ShortageCases, AffectedOrders, AuditEntries } = this.entities;
  const riskCalculator = new RiskCalculator(config);

  this.before('READ', Materials, req => {
    req.query.where({ isActive: true });
  });

  this.before('READ', ShortageCases, req => {
    req.query.orderBy({ caseNumber: 'asc' });
  });

  this.on('calculateMaterialRisk', async req => {
    const { materialID, plantID, storageLocationID } = req.data;

    if (!materialID || !plantID || !storageLocationID) {
      req.error(400, 'materialID, plantID, and storageLocationID are required');
    }

    const material = await SELECT.from(Materials).where({ ID: materialID });
    if (!material.length) {
      req.error(404, 'Invalid material');
    }

    const stock = await SELECT.from('MaterialStocks').where({
      material_ID: materialID,
      plant_ID: plantID,
      storageLocation_ID: storageLocationID
    });

    if (!stock.length) {
      req.error(404, 'No stock record found for the provided material, plant, and storage location');
    }

    const stockRecord = stock[0];
    const demands = await SELECT.from('MaterialDemands').where({
      material_ID: materialID,
      plant_ID: plantID
    });

    const result = riskCalculator.calculate({
      availableStock: Number(stockRecord.availableQuantity || 0),
      reservedStock: 0,
      confirmedIncomingStock: 0,
      demandQuantity: demands.reduce((sum, d) => sum + Number(d.demandQuantity || 0), 0),
      safetyStock: Number(material[0].safetyStock || 0),
      reorderPoint: Number(material[0].reorderPoint || 0),
      criticality: material[0].criticality || 'medium',
      horizonDays: config.defaultHorizonDays
    });

    return result;
  });

  this.on('generateShortageCase', async req => {
    const { materialID, plantID, storageLocationID } = req.data;

    if (!materialID || !plantID || !storageLocationID) {
      req.error(400, 'materialID, plantID, and storageLocationID are required');
    }

    return cds.tx(async tx => {
      const material = await tx.run(SELECT.from(Materials).where({ ID: materialID }));
      if (!material.length) {
        req.error(404, 'Invalid material');
      }

      const plant = await tx.run(SELECT.from('Plants').where({ ID: plantID }));
      if (!plant.length) {
        req.error(404, 'Invalid plant');
      }

      const storageLocation = await tx.run(SELECT.from('StorageLocations').where({ ID: storageLocationID }));
      if (!storageLocation.length) {
        req.error(404, 'Invalid storage location');
      }

      const stock = await tx.run(SELECT.from('MaterialStocks').where({
        material_ID: materialID,
        plant_ID: plantID,
        storageLocation_ID: storageLocationID
      }));

      if (!stock.length) {
        req.error(404, 'No stock record found');
      }

      const demands = await tx.run(SELECT.from('MaterialDemands').where({
        material_ID: materialID,
        plant_ID: plantID
      }));

      const riskResult = riskCalculator.calculate({
        availableStock: Number(stock[0].availableQuantity || 0),
        reservedStock: 0,
        confirmedIncomingStock: 0,
        demandQuantity: demands.reduce((sum, d) => sum + Number(d.demandQuantity || 0), 0),
        safetyStock: Number(material[0].safetyStock || 0),
        reorderPoint: Number(material[0].reorderPoint || 0),
        criticality: material[0].criticality || 'medium',
        horizonDays: config.defaultHorizonDays
      });

      if (riskResult.shortageQuantity <= 0) {
        req.error(409, 'No shortage detected; shortage case was not created');
      }

      const existingOpenCases = await tx.run(SELECT.from(ShortageCases).where({
        material_ID: materialID,
        plant_ID: plantID,
        storageLocation_ID: storageLocationID,
        status: { in: ['detected', 'analyzed', 'proposed', 'awaiting_approval'] }
      }));

      if (existingOpenCases.length > 0) {
        req.error(409, 'An open shortage case already exists for the selected material, plant, and storage location');
      }

      const now = new Date();
      const year = now.getFullYear();
      const nextSequence = String(Date.now()).slice(-6);
      const caseNumber = `SSC-${year}-${nextSequence}`;

      const newCase = await tx.run(INSERT.into(ShortageCases).entries({
        caseNumber,
        material_ID: materialID,
        plant_ID: plantID,
        storageLocation_ID: storageLocationID,
        status: 'detected',
        riskLevel: riskResult.riskLevel,
        shortageQuantity: riskResult.shortageQuantity,
        projectedAvailableQuantity: riskResult.projectedAvailableQuantity,
        expectedShortageDate: riskResult.expectedShortageDate || null,
        requiredResolutionDate: null,
        estimatedFinancialImpact: 0,
        currencyCode: material[0].currencyCode || 'EUR',
        rootCause: 'planning_error',
        assignedTo: 'Supply Chain',
        detectedAt: now.toISOString(),
        resolvedAt: null
      }));

      const caseId = newCase.ID || newCase[0]?.ID;

      await tx.run(INSERT.into(AffectedOrders).entries({
        shortageCase_ID: caseId,
        orderNumber: `ORD-${caseNumber}`,
        orderType: 'Production',
        customerPriority: 'high',
        affectedQuantity: riskResult.shortageQuantity,
        impactDescription: 'Generated from automated shortage analysis'
      }));

      await tx.run(INSERT.into(AuditEntries).entries({
        shortageCase_ID: caseId,
        eventType: 'created',
        eventDescription: 'Shortage case generated automatically from risk analysis',
        createdAt: now.toISOString()
      }));

      return tx.run(SELECT.from(ShortageCases).where({ ID: caseId }));
    });
  });
});