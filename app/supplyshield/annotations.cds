using SupplyShieldService as service from '../../srv/supply-shield-service';
annotate service.ShortageCases with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'caseNumber',
                Value : caseNumber,
            },
            {
                $Type : 'UI.DataField',
                Label : 'status',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Label : 'riskLevel',
                Value : riskLevel,
            },
            {
                $Type : 'UI.DataField',
                Label : 'shortageQuantity',
                Value : shortageQuantity,
            },
            {
                $Type : 'UI.DataField',
                Label : 'projectedAvailableQuantity',
                Value : projectedAvailableQuantity,
            },
            {
                $Type : 'UI.DataField',
                Label : 'expectedShortageDate',
                Value : expectedShortageDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'requiredResolutionDate',
                Value : requiredResolutionDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'estimatedFinancialImpact',
                Value : estimatedFinancialImpact,
            },
            {
                $Type : 'UI.DataField',
                Label : 'currencyCode',
                Value : currencyCode,
            },
            {
                $Type : 'UI.DataField',
                Label : 'rootCause',
                Value : rootCause,
            },
            {
                $Type : 'UI.DataField',
                Label : 'assignedTo',
                Value : assignedTo,
            },
            {
                $Type : 'UI.DataField',
                Label : 'detectedAt',
                Value : detectedAt,
            },
            {
                $Type : 'UI.DataField',
                Label : 'resolvedAt',
                Value : resolvedAt,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'caseNumber',
            Value : caseNumber,
        },
        {
            $Type : 'UI.DataField',
            Label : 'status',
            Value : status,
        },
        {
            $Type : 'UI.DataField',
            Label : 'riskLevel',
            Value : riskLevel,
        },
        {
            $Type : 'UI.DataField',
            Label : 'shortageQuantity',
            Value : shortageQuantity,
        },
        {
            $Type : 'UI.DataField',
            Label : 'projectedAvailableQuantity',
            Value : projectedAvailableQuantity,
        },
    ],
);

annotate service.ShortageCases with {
    material @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Materials',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : material_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'materialNumber',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'materialGroup',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'baseUnit',
            },
        ],
    }
};

annotate service.ShortageCases with {
    plant @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Plants',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : plant_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'plantCode',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'countryCode',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'timeZone',
            },
        ],
    }
};

annotate service.ShortageCases with {
    storageLocation @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'StorageLocations',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : storageLocation_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'storageLocationCode',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'isActive',
            },
        ],
    }
};

