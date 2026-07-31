sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/supplyshield/supplyshield/test/integration/pages/ShortageCasesList.gen",
	"com/supplyshield/supplyshield/test/integration/pages/ShortageCasesObjectPage.gen"
], function (JourneyRunner, ShortageCasesListGenerated, ShortageCasesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/supplyshield/supplyshield') + '/test/flp.html#app-preview',
        pages: {
			onTheShortageCasesListGenerated: ShortageCasesListGenerated,
			onTheShortageCasesObjectPageGenerated: ShortageCasesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

