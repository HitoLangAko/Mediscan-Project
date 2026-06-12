import medicines from '../data/medicine_reference.json';
import { MedicineReference, ParsedScan } from '../types/Medicine';
import { parseExpirationDate } from '../utils/date';

const refs = medicines as MedicineReference[];

const COMMON_ALIASES: Record<string, string> = {
  acetaminophen: 'Paracetamol',
  paracetamol: 'Paracetamol',
  amoxycillin: 'Amoxicillin',
  amox: 'Amoxicillin',
  cetirizine: 'Cetirizine',
  ibuprofen: 'Ibuprofen',
  loperamide: 'Loperamide',
  mefenamic: 'Mefenamic Acid',
  mefenamicacid: 'Mefenamic Acid',
  omeprazole: 'Omeprazole',
  amlodipine: 'Amlodipine',
  losartan: 'Losartan',
  metformin: 'Metformin',
  salbutamol: 'Salbutamol',
  ascorbic: 'Ascorbic Acid',
  vitaminc: 'Ascorbic Acid',
  lagundi: 'Lagundi',
  betadine: 'Povidone Iodine',
  povidone: 'Povidone Iodine',
};

const STOP_NAMES = new Set([
  'tablet', 'capsule', 'syrup', 'bottle', 'vial', 'ampule', 'solution', 'injection',
  'oral', 'cream', 'ointment', 'suspension', 'drops', 'powder', 'film coated',
]);

function normalize(s?: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasPhrase(text: string, phrase: string) {
  const t = ` ${normalize(text)} `;
  const p = ` ${normalize(phrase)} `;
  return p.trim().length >= 4 && t.includes(p);
}

const medicineNames = Array.from(new Set(
  refs.flatMap(ref => [
    ref.genericName,
    ref.brandName,
    ...(ref.activeIngredients || []),
  ])
    .map(name => (name || '').trim())
    .filter(name => name.length >= 4 && !STOP_NAMES.has(normalize(name)))
)).sort((a, b) => b.length - a.length);

const dosageForms = Array.from(new Set(
  refs.map(ref => ref.dosageForm)
    .filter(Boolean)
    .concat([
      'Tablet', 'Capsule', 'Syrup', 'Oral Suspension', 'Oral Solution',
      'Solution for Injection', 'Ampule', 'Vial', 'Cream', 'Ointment',
      'Eye Drops', 'Ear Drops', 'Inhaler', 'Sachet', 'Oral Drops', 'Suppository',
      'Film Coated Tablet', 'Chewable Tablet', 'Metered Dose Inhaler',
    ])
)).sort((a, b) => b.length - a.length);

function squish(s?: string) {
  return normalize(s).replace(/\s+/g, '');
}

function detectMedicineName(text: string): string | undefined {
  const exact = medicineNames.find(name => hasPhrase(text, name));
  if (exact) return exact;

  const sqText = squish(text);
  for (const [alias, canonical] of Object.entries(COMMON_ALIASES)) {
    if (sqText.includes(alias)) return canonical;
  }

  // Handles OCR outputs like "Paracetamol500mg" or partial line breaks.
  return medicineNames.find(name => {
    const sq = squish(name);
    return sq.length >= 6 && sqText.includes(sq);
  });
}

function detectDosageForm(text: string): string | undefined {
  return dosageForms.find(form => hasPhrase(text, form));
}

function detectBrandName(text: string): string | undefined {
  const upperLines = text
    .split(/\n|\r|\s{3,}/)
    .map(line => line.trim())
    .filter(line => line.length >= 3 && line.length <= 40);

  // A simple heuristic: packaging often puts brand name in uppercase near the top.
  const candidate = upperLines.find(line => {
    const letters = line.replace(/[^A-Za-z]/g, '');
    return letters.length >= 4 && letters === letters.toUpperCase();
  });
  return candidate ? candidate.replace(/[^A-Za-z0-9 +&-]/g, '').trim() : undefined;
}

export function parseScanText(rawText: string): ParsedScan {
  const text = rawText.replace(/[\t]+/g, ' ').replace(/\s+\n/g, '\n').trim();
  const flatText = text.replace(/\s+/g, ' ').trim();

  const strengthMatch = flatText.match(/(\d+(?:\.\d+)?\s?(?:mg\/mL|mcg\/mL|mg\/5\s?mL|mg\/g|mg|mcg|g|IU|units|%))(?:\s?\+\s?\d+(?:\.\d+)?\s?(?:mg\/mL|mcg\/mL|mg\/5\s?mL|mg|mcg|g|IU|units|%))?/i);
  const barcodeMatch = flatText.match(/\b(\d{12,14})\b/);
  const cprMatch = flatText.match(/(?:CPR|FDA\s?Reg(?:istration)?\.?\s?(?:No\.)?|DR-?)[\s:#-]*([A-Z0-9-]{4,})/i);
  const lotMatch = flatText.match(/(?:LOT|BATCH|BN|Lot No\.?|Batch No\.?)[:\s-]*([A-Z0-9-]{3,})/i);
  const manufacturerMatch = flatText.match(/(?:Manufacturer|Mfg\.? by|Manufactured by|Distributed by)[:\s]+([A-Za-z0-9 .,&-]{3,60})/i);

  return {
    rawText: text,
    brandName: detectBrandName(text),
    genericName: detectMedicineName(flatText),
    strength: strengthMatch?.[0]?.replace(/\s+/g, ' '),
    dosageForm: detectDosageForm(flatText),
    manufacturer: manufacturerMatch?.[1]?.trim(),
    barcodeGtin: barcodeMatch?.[1],
    cprNumber: cprMatch?.[1],
    batchNumber: lotMatch?.[1],
    lotNumber: lotMatch?.[1],
    expirationDate: parseExpirationDate(flatText),
    pillFeatures: /pill only|capsule only|tablet only/i.test(flatText) ? 'Pill/capsule image only; no packaging, barcode, or label detected.' : undefined,
  };
}
