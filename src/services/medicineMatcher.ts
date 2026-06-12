import medicines from '../data/medicine_reference.json';
import { CandidateMatch, FieldExtractionSummary, MedicineReference, ParsedScan } from '../types/Medicine';

const refs = medicines as MedicineReference[];

function normalize(s?: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function includes(haystack?: string, needle?: string) {
  const h = normalize(haystack);
  const n = normalize(needle);
  return Boolean(h && n && ` ${h} `.includes(` ${n} `));
}

function tokens(s?: string): string[] {
  return normalize(s)
    .split(' ')
    .filter(t => t.length > 2 && !['mg', 'mcg', 'ml', 'the', 'for', 'and', 'with', 'oral', 'per', 'dose', 'bottle', 'tablet', 'capsule'].includes(t));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function tokenOverlapScore(rawText: string, ref: MedicineReference) {
  const rawSet = new Set(tokens(rawText));
  const refTokens = unique(tokens(`${ref.sourceDrugName} ${ref.genericName} ${(ref.activeIngredients || []).join(' ')} ${ref.commonUses}`));
  if (refTokens.length === 0) return 0;
  const hits = refTokens.filter(t => rawSet.has(t)).length;
  const ratio = hits / Math.min(refTokens.length, 10);
  if (ratio >= 0.7) return 24;
  if (ratio >= 0.45) return 15;
  if (ratio >= 0.25) return 8;
  return 0;
}

export function getAllMedicineReferences(): MedicineReference[] {
  return refs;
}

export function searchReferences(query: string, limit = 50): MedicineReference[] {
  const q = normalize(query);
  if (!q) return refs.slice(0, limit);
  return refs.filter(r =>
    normalize(r.sourceDrugName).includes(q) ||
    normalize(r.genericName).includes(q) ||
    normalize(r.brandName).includes(q) ||
    normalize((r.activeIngredients || []).join(' ')).includes(q) ||
    normalize(r.commonUses).includes(q) ||
    normalize(r.barcodeGtin).includes(q) ||
    normalize(r.philippineFdaCprNumber).includes(q)
  ).slice(0, limit);
}

export function findMatches(parsed: ParsedScan): CandidateMatch[] {
  const candidates: CandidateMatch[] = [];
  const raw = parsed.rawText || '';

  for (const ref of refs) {
    let score = 0;
    const reasons: string[] = [];

    if (parsed.barcodeGtin && ref.barcodeGtin && parsed.barcodeGtin === ref.barcodeGtin) {
      score += 90;
      reasons.push('Barcode/GTIN matched');
    }

    if (parsed.cprNumber && ref.philippineFdaCprNumber && parsed.cprNumber === ref.philippineFdaCprNumber) {
      score += 90;
      reasons.push('Philippine FDA CPR number matched');
    }

    if (parsed.genericName && includes(ref.genericName, parsed.genericName)) {
      score += 40;
      reasons.push('Generic/ingredient name matched');
    } else if (raw && includes(raw, ref.genericName)) {
      score += 32;
      reasons.push('QVAC OCR text contains generic name');
    }

    if (parsed.brandName && ref.brandName && (includes(parsed.brandName, ref.brandName) || includes(ref.brandName, parsed.brandName))) {
      score += 22;
      reasons.push('Brand name matched');
    }

    if (parsed.strength && (includes(ref.strength, parsed.strength) || includes(ref.sourceDrugName, parsed.strength))) {
      score += 20;
      reasons.push('Strength matched');
    }

    if (parsed.dosageForm && includes(ref.dosageForm, parsed.dosageForm)) {
      score += 10;
      reasons.push('Dosage form matched');
    }

    const overlap = tokenOverlapScore(raw, ref);
    if (overlap > 0) {
      score += overlap;
      reasons.push('OCR/context similarity matched');
    }

    if (score > 0) candidates.push({ reference: ref, score: Math.min(Math.round(score), 100), reasons });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

export function autofillParsedFromTopMatch(parsed: ParsedScan, top?: MedicineReference): { parsed: ParsedScan; summary: FieldExtractionSummary[] } {
  const summary: FieldExtractionSummary[] = [];
  const next: ParsedScan = { ...parsed };

  const setIfEmpty = (field: keyof ParsedScan, value?: string) => {
    if (!next[field] && value) {
      (next as any)[field] = value;
      summary.push({ field, value, source: 'database-autofill' });
    } else if (next[field]) {
      summary.push({ field, value: String(next[field]), source: 'qvac-ai' });
    }
  };

  if (top) {
    setIfEmpty('genericName', top.genericName);
    setIfEmpty('strength', top.strength);
    setIfEmpty('dosageForm', top.dosageForm);
    setIfEmpty('manufacturer', top.manufacturer);
    setIfEmpty('barcodeGtin', top.barcodeGtin);
    setIfEmpty('cprNumber', top.philippineFdaCprNumber);
  }

  if (!next.genericName) summary.push({ field: 'genericName', value: 'Not detected', source: 'not-detected' });
  if (!next.strength) summary.push({ field: 'strength', value: 'Not detected', source: 'not-detected' });
  if (!next.dosageForm) summary.push({ field: 'dosageForm', value: 'Not detected', source: 'not-detected' });

  return { parsed: next, summary };
}

export function findReferencesForQuestion(question: string, limit = 5): CandidateMatch[] {
  const raw = question || '';
  const qTokens = new Set(tokens(raw));
  const candidates: CandidateMatch[] = [];

  for (const ref of refs) {
    let score = 0;
    const reasons: string[] = [];
    const searchable = `${ref.sourceDrugName} ${ref.genericName} ${(ref.activeIngredients || []).join(' ')} ${ref.commonUses} ${ref.warnings} ${ref.sideEffects}`;
    const refTokens = unique(tokens(searchable));
    const hits = refTokens.filter(t => qTokens.has(t)).length;

    if (includes(raw, ref.genericName)) {
      score += 45;
      reasons.push('Question contains generic name');
    }
    if (ref.brandName && includes(raw, ref.brandName)) {
      score += 35;
      reasons.push('Question contains brand name');
    }
    if (hits > 0) {
      score += Math.min(hits * 7, 35);
      reasons.push('Question matched medicine/use keywords');
    }
    if (score > 0) candidates.push({ reference: ref, score: Math.min(score, 100), reasons });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}
