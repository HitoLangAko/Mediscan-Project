export type ScanSource = 'label' | 'box' | 'blister' | 'barcode' | 'pill' | 'manual' | 'photo';
export type ScanStatus = 'Verified' | 'Needs Verification' | 'Expired';
export type FdaRegistrationStatus = 'Registered' | 'Not Found' | 'Expired Registration' | 'Needs Manual Check';

export type MedicineReference = {
  id: string;
  dpriId: number | null;
  sourceDrugName: string;
  genericName: string;
  activeIngredients: string[];
  strength: string;
  dosageForm: string;
  route: string;
  brandName?: string;
  manufacturer?: string;
  barcodeGtin?: string;
  philippineFdaCprNumber?: string;
  fdaRegistrationStatus: FdaRegistrationStatus;
  commonUses: string;
  warnings: string;
  sideEffects: string;
  contraindications: string;
  drugInteractions: string;
  storageInstructions: string;
  lowestPricePhp: number | null;
  medianPricePhp: number | null;
  highestPricePhp: number | null;
  sourcePage: number | null;
  sourceYear: number;
  datasetStatus: string;
  safetyNotes: string;
  lastUpdated: string;
};

export type ParsedScan = {
  rawText: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcodeGtin?: string;
  cprNumber?: string;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  pillFeatures?: string;
};

export type CandidateMatch = {
  reference: MedicineReference;
  score: number;
  reasons: string[];
};

export type ExtractedFieldSource = 'qvac-ocr' | 'qvac-ai' | 'parser' | 'database-autofill' | 'not-detected';

export type FieldExtractionSummary = {
  field: keyof ParsedScan | 'displayName' | 'commonUses' | 'warnings' | 'sideEffects';
  value: string;
  source: ExtractedFieldSource;
};

export type MedicineSuitabilityAssessment = {
  userConcern: string;
  decision: 'May match listed use' | 'Needs pharmacist/doctor confirmation' | 'Not enough information' | 'Possible mismatch';
  answer: string;
  evidence: string[];
  safety: string;
  generatedBy: 'qvac-ai' | 'local-rag-fallback';
};

export type ScanResult = {
  scanId: string;
  source: ScanSource;
  imageUri?: string | number;
  parsed: ParsedScan;
  candidates: CandidateMatch[];
  finalStatus: ScanStatus;
  confidenceScore: number;
  safetyWarning: string;
  createdAt: string;
  extractionSummary?: FieldExtractionSummary[];
  qvacMode?: string;
  qvacNotes?: string;
  suitability?: MedicineSuitabilityAssessment;
};

export type UserMedicine = {
  userMedicineId: string;
  referenceId?: string;
  displayName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcodeGtin?: string;
  cprNumber?: string;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  scanSource: ScanSource;
  scanStatus: ScanStatus;
  confidenceScore: number;
  imageUri?: string | number;
  notes?: string;
  savedAt: string;
  updatedAt?: string;
};

export type HelpdeskAnswer = {
  question: string;
  answer: string;
  safety: string;
  sources: string[];
  matchedMedicines: CandidateMatch[];
  generatedBy: 'qvac-ai' | 'local-rag-fallback';
};
