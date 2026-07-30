const cds = require('@sap/cds');
const { RiskCalculator } = require('./lib/risk-calculator');
const { SubstituteEngine } = require('./lib/substitute-engine');
const config = require('./lib/risk-config');

module.exports = cds.service.impl(async function() {
  const {
    Materials,
    ShortageCases,
    AffectedOrders,
    AuditEntries,
    ResolutionProposals,
    ApprovalSteps
  } = this.entities;

  const riskCalculator = new RiskCalculator(config);
  const substituteEngine = new SubstituteEngine();

  // --- QUERY HOOKS ---
  this.before('READ', Materials, req => {
    req.query.where({ isActive: true });
  });

  this.before('READ', ShortageCases, req => {
    req.query.orderBy({ caseNumber: 'asc' });
  });

  // --- RISK ASSESSMENT & SHORTAGE CREATION ---
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

  // --- SUBSTITUTION & SIMULATION ---
  this.on('findSubstituteCandidates', async req => {
    const { caseID } = req.data;

    if (!caseID) {
      req.error(400, 'caseID is required');
    }

    const shortageCase = await SELECT.from(ShortageCases).where({ ID: caseID });
    if (!shortageCase.length) {
      req.error(404, 'Invalid shortage case');
    }

    const materialID = shortageCase[0].material_ID;
    const substitutes = await SELECT.from('MaterialSubstitutes').where({ material_ID: materialID });

    const candidates = substitutes.map(item => {
      const scoreResult = substituteEngine.scoreCandidate({
        compatibility: 85,
        availability: 90,
        priceDifference: 15,
        supplierReliability: 80,
        leadTimeDays: 7,
        quantityCapable: 100,
        requiredQuantity: Number(shortageCase[0].shortageQuantity || 0)
      });

      return {
        materialSubstituteID: item.substituteMaterial_ID,
        materialNumber: item.substituteMaterial_ID,
        description: 'Substitute candidate',
        score: scoreResult.score,
        explanation: scoreResult.explanation
      };
    });

    return candidates.sort((a, b) => b.score - a.score);
  });

  this.on('simulateResolution', async req => {
    const { caseID, materialSubstituteID, proposedQuantity } = req.data;

    if (!caseID || !materialSubstituteID || proposedQuantity == null) {
      req.error(400, 'caseID, materialSubstituteID, and proposedQuantity are required');
    }

    const shortageCase = await SELECT.from(ShortageCases).where({ ID: caseID });
    if (!shortageCase.length) {
      req.error(404, 'Invalid shortage case');
    }

    const requestedQty = Number(proposedQuantity || 0);
    const availableQty = 100;
    const protectedDemand = Math.min(requestedQty, 20);
    const remainingShortage = Math.max(0, Number(shortageCase[0].shortageQuantity || 0) - requestedQty);

    const currentSolutionCost = Number(shortageCase[0].estimatedFinancialImpact || 0);
    const substituteSolutionCost = currentSolutionCost + (requestedQty * 25);
    const additionalCost = substituteSolutionCost - currentSolutionCost;
    const priceIncreasePercentage = currentSolutionCost > 0
      ? (additionalCost / currentSolutionCost) * 100
      : 0;

    const warnings = [];
    if (requestedQty > availableQty) {
      warnings.push('Requested quantity exceeds available substitute quantity');
    }
    if (remainingShortage > 0) {
      warnings.push('Remaining shortage remains after substitution');
    }

    return {
      requestedSubstituteQuantity: requestedQty,
      availableSubstituteQuantity: availableQty,
      protectedDemand,
      remainingShortage,
      currentSolutionCost,
      substituteSolutionCost,
      additionalCost,
      priceIncreasePercentage,
      estimatedDelay: 7,
      requiredApprovalTypes: 'engineering,quality',
      feasibilityStatus: warnings.length ? 'warning' : 'feasible',
      warnings: warnings.join('; ')
    };
  });

  // --- PROPOSALS & APPROVAL WORKFLOW ---
  this.on('createResolutionProposal', async req => {
    const { caseID, materialSubstituteID, proposedQuantity, comment } = req.data;

    if (!caseID || !materialSubstituteID || proposedQuantity == null) {
      req.error(400, 'caseID, materialSubstituteID, and proposedQuantity are required');
    }

    return cds.tx(async tx => {
      const shortageCase = await tx.run(SELECT.from(ShortageCases).where({ ID: caseID }));
      if (!shortageCase.length) {
        req.error(404, 'Invalid shortage case');
      }

      const existingApproved = await tx.run(SELECT.from(ResolutionProposals).where({
        shortageCase_ID: caseID,
        status: 'approved'
      }));

      if (existingApproved.length > 0) {
        req.error(409, 'An approved proposal already exists for this case');
      }

      const proposal = await tx.run(INSERT.into(ResolutionProposals).entries({
        shortageCase_ID: caseID,
        proposedSubstitute_ID: materialSubstituteID,
        proposedQuantity,
        expectedUnitPrice: 0,
        additionalCost: 0,
        priceIncreasePercent: 0,
        leadTimeDays: 0,
        protectedDemandQty: 0,
        remainingShortageQty: proposedQuantity,
        compatibilityScore: 0,
        overallScore: 0,
        status: 'draft',
        submittedAt: null
      }));

      await tx.run(INSERT.into(AuditEntries).entries({
        shortageCase_ID: caseID,
        eventType: 'proposal_created',
        eventDescription: 'Resolution proposal created',
        createdAt: new Date().toISOString()
      }));

      return tx.run(SELECT.from(ResolutionProposals).where({ ID: proposal.ID || proposal[0]?.ID }));
    });
  });

  this.on('submitProposal', async req => {
    const { proposalID } = req.data;

    if (!proposalID) {
      req.error(400, 'proposalID is required');
    }

    return cds.tx(async tx => {
      const proposal = await tx.run(SELECT.from(ResolutionProposals).where({ ID: proposalID }));
      if (!proposal.length) {
        req.error(404, 'Invalid proposal');
      }

      const currentProposal = proposal[0];
      if (currentProposal.status !== 'draft') {
        req.error(409, 'Only draft proposals can be submitted');
      }

      const shortageCase = await tx.run(SELECT.from(ShortageCases).where({ ID: currentProposal.shortageCase_ID }));
      if (!shortageCase.length) {
        req.error(404, 'Invalid shortage case');
      }

      const approvalSteps = [
        { approvalType: 'engineering', sequence: 1, assignedApprover: 'Engineering Approver', status: 'pending' },
        { approvalType: 'quality', sequence: 2, assignedApprover: 'Quality Approver', status: 'pending' },
        { approvalType: 'finance', sequence: 3, assignedApprover: 'Finance Approver', status: 'pending' }
      ];

      for (const step of approvalSteps) {
        await tx.run(INSERT.into(ApprovalSteps).entries({
          proposal_ID: proposalID,
          approvalType: step.approvalType,
          sequence: step.sequence,
          assignedApprover: step.assignedApprover,
          status: step.status,
          decisionTime: null,
          decisionComment: null
        }));
      }

      await tx.run(UPDATE(ResolutionProposals).set({ status: 'submitted', submittedAt: new Date().toISOString() }).where({ ID: proposalID }));
      await tx.run(UPDATE(ShortageCases).set({ status: 'awaiting_approval' }).where({ ID: currentProposal.shortageCase_ID }));

      await tx.run(INSERT.into(AuditEntries).entries({
        shortageCase_ID: currentProposal.shortageCase_ID,
        eventType: 'proposal_submitted',
        eventDescription: 'Resolution proposal submitted for approval',
        createdAt: new Date().toISOString()
      }));

      return tx.run(SELECT.from(ResolutionProposals).where({ ID: proposalID }));
    });
  });

  this.on('approveStep', async req => {
    const { approvalStepID, comment } = req.data;

    if (!approvalStepID) {
      req.error(400, 'approvalStepID is required');
    }

    return cds.tx(async tx => {
      const step = await tx.run(SELECT.from(ApprovalSteps).where({ ID: approvalStepID }));
      if (!step.length) {
        req.error(404, 'Invalid approval step');
      }

      const currentStep = step[0];
      if (currentStep.status !== 'pending') {
        req.error(409, 'Only pending approval steps can be approved');
      }

      if (!comment || !String(comment).trim()) {
        req.error(400, 'A decision comment is required');
      }

      await tx.run(UPDATE(ApprovalSteps).set({
        status: 'approved',
        decisionTime: new Date().toISOString(),
        decisionComment: comment
      }).where({ ID: approvalStepID }));

      const parentProposal = await tx.run(SELECT.from(ResolutionProposals).where({ ID: currentStep.proposal_ID }));

      await tx.run(INSERT.into(AuditEntries).entries({
        shortageCase_ID: parentProposal[0]?.shortageCase_ID,
        eventType: 'approval_step_approved',
        eventDescription: `Approval step approved: ${currentStep.approvalType}`,
        createdAt: new Date().toISOString()
      }));

      return tx.run(SELECT.from(ApprovalSteps).where({ ID: approvalStepID }));
    });
  });

  this.on('rejectStep', async req => {
    const { approvalStepID, reason } = req.data;

    if (!approvalStepID) {
      req.error(400, 'approvalStepID is required');
    }

    return cds.tx(async tx => {
      const step = await tx.run(SELECT.from(ApprovalSteps).where({ ID: approvalStepID }));
      if (!step.length) {
        req.error(404, 'Invalid approval step');
      }

      const currentStep = step[0];
      if (currentStep.status !== 'pending') {
        req.error(409, 'Only pending approval steps can be rejected');
      }

      if (!reason || !String(reason).trim()) {
        req.error(400, 'A rejection reason is required');
      }

      await tx.run(UPDATE(ApprovalSteps).set({
        status: 'rejected',
        decisionTime: new Date().toISOString(),
        decisionComment: reason
      }).where({ ID: approvalStepID }));

      const proposal = await tx.run(SELECT.from(ResolutionProposals).where({ ID: currentStep.proposal_ID }));
      if (proposal.length) {
        await tx.run(UPDATE(ResolutionProposals).set({ status: 'rejected' }).where({ ID: currentStep.proposal_ID }));
        await tx.run(UPDATE(ShortageCases).set({ status: 'rejected' }).where({ ID: proposal[0].shortageCase_ID }));

        await tx.run(INSERT.into(AuditEntries).entries({
          shortageCase_ID: proposal[0].shortageCase_ID,
          eventType: 'proposal_rejected',
          eventDescription: 'Resolution proposal rejected',
          createdAt: new Date().toISOString()
        }));
      }

      return tx.run(SELECT.from(ApprovalSteps).where({ ID: approvalStepID }));
    });
  });
});