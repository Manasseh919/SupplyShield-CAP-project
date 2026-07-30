namespace com.supplyshield;

type MaterialCriticality : String enum {
  low;
  medium;
  high;
  critical;
}

type ShortageRiskLevel : String enum {
  low;
  medium;
  high;
  critical;
}

type ShortageCaseStatus : String enum {
  detected;
  analyzed;
  proposed;
  awaiting_approval;
  approved;
  rejected;
  resolved;
  closed;
}

type RootCause : String enum {
  supplier_issue;
  demand_spike;
  production_delay;
  logistics_delay;
  quality_issue;
  planning_error;
  other;
}

type SubstituteApprovalStatus : String enum {
  pending;
  approved;
  rejected;
}

type ProposalStatus : String enum {
  draft;
  submitted;
  approved;
  rejected;
  superseded;
}

type ApprovalType : String enum {
  engineering;
  quality;
  finance;
  procurement;
  management;
}

type ApprovalStatus : String enum {
  pending;
  approved;
  rejected;
}

type CustomerPriority : String enum {
  low;
  medium;
  high;
  critical;
}

type PurchaseOrderStatus : String enum {
  created;
  approved;
  partially_received;
  completed;
  cancelled;
}