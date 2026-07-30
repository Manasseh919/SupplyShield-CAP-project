const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { Materials, ShortageCases } = this.entities;

  this.before('READ', Materials, req => {
    req.query.where({ isActive: true });
  });

  this.before('READ', ShortageCases, req => {
    req.query.orderBy({ caseNumber: 'asc' });
  });
});