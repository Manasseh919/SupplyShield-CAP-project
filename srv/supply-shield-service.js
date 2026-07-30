const cds = require('@sap/cds');
const { RiskCalculator } = require('./lib/risk-calculator');
const config = require('./lib/risk-config');

module.exports = cds.service.impl(async function() {
  const { Materials, ShortageCases } = this.entities;
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
});