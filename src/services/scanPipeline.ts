import { DemoSample } from '../data/demoSamples';
import { autofillParsedFromTopMatch, findMatches } from './medicineMatcher';
import { determineMedicineStatus, safetyWarningFor } from './status';
import { extractFromDemoSample, extractFromManualText, extractFromUserImage, unloadQvacOcrModel } from './qvacAdapter';
import { ScanResult, ScanSource } from '../types/Medicine';
import { assessMedicineForConcern, structureMedicineFieldsWithQvac } from './qvacMedicineAI';

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function buildScanResult(params: {
  imageUri?: string | number;
  source: ScanSource;
  rawText: string;
  extractionConfidence: number;
  qvacMode?: string;
  qvacNotes?: string;
  userConcern?: string;
}): Promise<ScanResult> {
  const structured = params.rawText.trim()
    ? await structureMedicineFieldsWithQvac(params.rawText)
    : {
        fields: { rawText: '' },
        generatedBy: 'parser-fallback' as const,
        notes: 'No readable OCR text was found, so QVAC text structuring was skipped.',
      };
  const initialParsed = { rawText: params.rawText, ...structured.fields };
  const initialCandidates = findMatches(initialParsed);
  const top = initialCandidates[0]?.reference;
  const { parsed, summary } = autofillParsedFromTopMatch(initialParsed, top);
  const candidates = findMatches(parsed);
  const confidence = candidates[0]?.score || Math.round(params.extractionConfidence * 100);
  const finalStatus = determineMedicineStatus({
    source: params.source,
    confidence,
    expirationDate: parsed.expirationDate,
    hasDatabaseMatch: candidates.length > 0,
  });

  const suitability = params.userConcern && candidates[0]
    ? await assessMedicineForConcern(candidates[0].reference, params.userConcern)
    : undefined;

  return {
    scanId: id('scan'),
    source: params.source,
    imageUri: params.imageUri,
    parsed,
    candidates,
    finalStatus,
    confidenceScore: confidence,
    safetyWarning: safetyWarningFor(params.source, finalStatus),
    createdAt: new Date().toISOString(),
    extractionSummary: summary,
    qvacMode: structured.generatedBy === 'qvac-ai' ? 'qvac-ocr + qvac-ai-structure' : params.qvacMode,
    qvacNotes: `${params.qvacNotes || ''} ${structured.notes}`.trim(),
    suitability,
  };
}

export async function runDemoScan(sample: DemoSample, userConcern?: string): Promise<ScanResult> {
  const extraction = await extractFromDemoSample(sample);
  return buildScanResult({
    imageUri: sample.image,
    source: sample.source,
    rawText: extraction.rawText,
    extractionConfidence: extraction.confidence,
    qvacMode: extraction.mode,
    qvacNotes: extraction.notes,
    userConcern,
  });
}

export async function runImageScan(uri: string, source: ScanSource = 'photo', userConcern?: string): Promise<ScanResult> {
  const extraction = await extractFromUserImage(uri);
  await unloadQvacOcrModel();
  return buildScanResult({
    imageUri: uri,
    source,
    rawText: extraction.rawText,
    extractionConfidence: extraction.confidence,
    qvacMode: extraction.mode,
    qvacNotes: extraction.notes,
    userConcern,
  });
}

export async function runManualTextScan(text: string, userConcern?: string): Promise<ScanResult> {
  const extraction = await extractFromManualText(text);
  return buildScanResult({
    source: 'manual',
    rawText: extraction.rawText,
    extractionConfidence: extraction.confidence,
    qvacMode: extraction.mode,
    qvacNotes: extraction.notes,
    userConcern,
  });
}

export async function assessExistingScanForConcern(result: ScanResult, userConcern: string): Promise<ScanResult> {
  const top = result.candidates[0]?.reference;
  if (!top) return result;
  const suitability = await assessMedicineForConcern(top, userConcern);
  return { ...result, suitability };
}
