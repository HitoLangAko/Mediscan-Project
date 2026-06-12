import { CandidateMatch, HelpdeskAnswer, MedicineReference, MedicineSuitabilityAssessment, ParsedScan } from '../types/Medicine';
import { parseScanText } from './parseScanText';
import { findMatches, findReferencesForQuestion } from './medicineMatcher';

export type QvacStructuredExtraction = {
  fields: Partial<ParsedScan>;
  generatedBy: 'qvac-ai' | 'parser-fallback';
  notes: string;
};

const GENERAL_MEDICINE_SAFETY =
  'This is medicine reference support only, not diagnosis or prescribing. Confirm with the official product label, pharmacist, or doctor, especially for children, pregnancy, allergies, chronic illness, antibiotics, injections, controlled medicines, or severe symptoms.';

function compactRef(ref: MedicineReference): string {
  return [
    `Name: ${ref.sourceDrugName}`,
    `Generic: ${ref.genericName}`,
    `Ingredients: ${(ref.activeIngredients || []).join(', ') || ref.genericName}`,
    `Strength/Form: ${ref.strength || 'N/A'} ${ref.dosageForm || ''}`.trim(),
    `Uses: ${ref.commonUses || 'N/A'}`,
    `Warnings: ${ref.warnings || 'N/A'}`,
    `Side effects: ${ref.sideEffects || 'N/A'}`,
    `Interactions: ${ref.drugInteractions || 'N/A'}`,
  ].join('\n');
}

function normalize(text?: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function localConcernDecision(ref: MedicineReference, concern: string): MedicineSuitabilityAssessment['decision'] {
  const c = normalize(concern);
  const searchable = normalize(`${ref.commonUses} ${ref.sourceDrugName} ${ref.genericName}`);

  const groups: Array<{ terms: string[]; needles: string[] }> = [
    { terms: ['fever', 'lagnat', 'temperature'], needles: ['fever'] },
    { terms: ['pain', 'headache', 'body pain', 'sakit', 'toothache', 'menstrual', 'dysmenorrhea'], needles: ['pain', 'pain relief', 'mild to moderate pain', 'menstrual'] },
    { terms: ['allergy', 'allergies', 'sneezing', 'runny nose', 'hives', 'itchy'], needles: ['allergy', 'allergy symptoms', 'hives', 'sneezing'] },
    { terms: ['diarrhea', 'lbm', 'loose stool'], needles: ['diarrhea'] },
    { terms: ['cough', 'ubo'], needles: ['cough'] },
    { terms: ['acid', 'heartburn', 'reflux', 'hyperacidity'], needles: ['acid reflux', 'heartburn', 'stomach acid'] },
    { terms: ['infection', 'bacterial', 'antibiotic'], needles: ['bacterial infections', 'antibiotic'] },
    { terms: ['blood pressure', 'hypertension', 'high blood'], needles: ['blood pressure', 'hypertension'] },
    { terms: ['diabetes', 'blood sugar'], needles: ['blood sugar', 'diabetes'] },
  ];

  for (const group of groups) {
    if (group.terms.some(t => c.includes(t))) {
      return group.needles.some(n => searchable.includes(n)) ? 'May match listed use' : 'Possible mismatch';
    }
  }

  return 'Not enough information';
}

function localSuitability(ref: MedicineReference, concern: string): MedicineSuitabilityAssessment {
  const decision = localConcernDecision(ref, concern);
  const evidence = [
    `Database use: ${ref.commonUses || 'No detailed use has been enriched for this record yet.'}`,
    `Warnings: ${ref.warnings || 'No warning details available in the local record.'}`,
  ];

  let answer = `The local database record for ${ref.sourceDrugName} says: ${ref.commonUses || 'no detailed use is available yet.'}`;
  if (decision === 'May match listed use') {
    answer += ` Based on that record, it may match the concern you entered, but the app cannot confirm that it is the correct medicine for you personally.`;
  } else if (decision === 'Possible mismatch') {
    answer += ` Based on the local record, this does not clearly match the concern you entered. Please ask a pharmacist or doctor before using it for that purpose.`;
  } else {
    answer += ` The concern you entered is too broad or the local record is not detailed enough to determine a match.`;
  }

  return {
    userConcern: concern,
    decision,
    answer,
    evidence,
    safety: GENERAL_MEDICINE_SAFETY,
    generatedBy: 'local-rag-fallback',
  };
}

function extractJsonObject(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function runQvacText(prompt: string): Promise<string | null> {
  try {
    const qvac: any = await import('@qvac/sdk');

    // QVAC SDK APIs can change during the hackathon. This adapter tries common
    // text-generation entry points and safely falls back to local RAG if the
    // installed SDK/model is not configured yet.
    const possibleModelSrc =
      qvac.FABRIC_LLAMA_3_2_1B_INSTRUCT ||
      qvac.FABRIC_QWEN_2_5_1_5B_INSTRUCT ||
      qvac.LLAMA_3_2_1B_INSTRUCT ||
      qvac.QVAC_TEXT_GENERATION_MODEL ||
      undefined;

    let modelId: string | undefined;
    if (typeof qvac.loadModel === 'function' && possibleModelSrc) {
      modelId = await qvac.loadModel({
        modelSrc: possibleModelSrc,
        modelType: 'text-generation',
        modelConfig: { temperature: 0.1, maxTokens: 700 },
      });
    }

    const payload = modelId
      ? { modelId, prompt, messages: [{ role: 'user', content: prompt }], maxTokens: 700, temperature: 0.1 }
      : { prompt, messages: [{ role: 'user', content: prompt }], maxTokens: 700, temperature: 0.1 };

    const fn = qvac.generateText || qvac.textGeneration || qvac.chat || qvac.complete || qvac.llm;
    if (typeof fn !== 'function') return null;

    const result = await fn(payload);
    if (typeof result === 'string') return result;
    if (typeof result?.text === 'string') return result.text;
    if (typeof result?.content === 'string') return result.content;
    if (typeof result?.message?.content === 'string') return result.message.content;
    if (Array.isArray(result?.choices) && result.choices[0]?.message?.content) return result.choices[0].message.content;
    return null;
  } catch (error) {
    return null;
  }
}

export async function structureMedicineFieldsWithQvac(rawText: string): Promise<QvacStructuredExtraction> {
  const fallback = parseScanText(rawText);
  const prompt = `You are the on-device medicine extraction module for MediScan. Extract only fields that are visible in the OCR text. Do not invent data. Return valid JSON only with keys: brandName, genericName, strength, dosageForm, manufacturer, barcodeGtin, cprNumber, batchNumber, lotNumber, expirationDate. Use expirationDate as YYYY-MM-DD, YYYY-MM, or original text if unclear. OCR text:\n\n${rawText}`;

  const aiText = await runQvacText(prompt);
  const json = aiText ? extractJsonObject(aiText) : null;
  if (!json) {
    return { fields: fallback, generatedBy: 'parser-fallback', notes: 'QVAC text model not available; used local parser after QVAC OCR.' };
  }

  return {
    fields: {
      rawText,
      brandName: json.brandName || fallback.brandName,
      genericName: json.genericName || fallback.genericName,
      strength: json.strength || fallback.strength,
      dosageForm: json.dosageForm || fallback.dosageForm,
      manufacturer: json.manufacturer || fallback.manufacturer,
      barcodeGtin: json.barcodeGtin || fallback.barcodeGtin,
      cprNumber: json.cprNumber || fallback.cprNumber,
      batchNumber: json.batchNumber || fallback.batchNumber,
      lotNumber: json.lotNumber || fallback.lotNumber,
      expirationDate: json.expirationDate || fallback.expirationDate,
      pillFeatures: fallback.pillFeatures,
    },
    generatedBy: 'qvac-ai',
    notes: 'QVAC OCR extracted text, then QVAC text AI structured the medicine fields.',
  };
}

export async function assessMedicineForConcern(
  ref: MedicineReference,
  concern: string,
): Promise<MedicineSuitabilityAssessment> {
  const fallback = localSuitability(ref, concern);
  const prompt = `You are MediScan's local medicine helpdesk. Use only the database record below. Do not diagnose, prescribe, or recommend dosage. Answer whether the listed medicine appears related to the user's stated concern, and include a safety warning. Return JSON only with keys: decision, answer, evidence, safety. decision must be one of: May match listed use, Needs pharmacist/doctor confirmation, Not enough information, Possible mismatch.\n\nUser concern: ${concern}\n\nMedicine database record:\n${compactRef(ref)}`;

  const aiText = await runQvacText(prompt);
  const json = aiText ? extractJsonObject(aiText) : null;
  if (!json) return fallback;

  const decision = ['May match listed use', 'Needs pharmacist/doctor confirmation', 'Not enough information', 'Possible mismatch'].includes(json.decision)
    ? json.decision
    : fallback.decision;

  return {
    userConcern: concern,
    decision,
    answer: json.answer || fallback.answer,
    evidence: Array.isArray(json.evidence) ? json.evidence.map(String).slice(0, 4) : fallback.evidence,
    safety: json.safety || GENERAL_MEDICINE_SAFETY,
    generatedBy: 'qvac-ai',
  };
}

export async function askMediScanHelpdesk(question: string): Promise<HelpdeskAnswer> {
  const matches = findReferencesForQuestion(question, 5);
  const context = matches.map((match, index) => `SOURCE ${index + 1} [score ${match.score}]\n${compactRef(match.reference)}`).join('\n\n');

  const fallbackAnswer = buildLocalHelpdeskAnswer(question, matches);

  const prompt = `You are MediScan Helpdesk, an on-device medicine information assistant. Answer using only the provided local database sources. Do not diagnose, prescribe, or give dosage instructions. If the evidence is weak or the question asks if a user should take a medicine, say to ask a pharmacist/doctor. Keep the answer practical and safe.\n\nQuestion: ${question}\n\nLocal database sources:\n${context || 'No close medicine source found.'}`;

  const aiText = await runQvacText(prompt);
  if (!aiText) return fallbackAnswer;

  return {
    question,
    answer: aiText.trim(),
    safety: GENERAL_MEDICINE_SAFETY,
    sources: matches.map(m => m.reference.sourceDrugName),
    matchedMedicines: matches,
    generatedBy: 'qvac-ai',
  };
}

function buildLocalHelpdeskAnswer(question: string, matches: CandidateMatch[]): HelpdeskAnswer {
  if (matches.length === 0) {
    return {
      question,
      answer: 'I could not find a close medicine match in the local database. Try asking with the generic name, brand name, or strength from the label. If you are unsure about a medicine, ask a pharmacist or doctor before using it.',
      safety: GENERAL_MEDICINE_SAFETY,
      sources: [],
      matchedMedicines: [],
      generatedBy: 'local-rag-fallback',
    };
  }

  const top = matches[0].reference;
  return {
    question,
    answer: `${top.sourceDrugName}: ${top.commonUses || 'No detailed use is available in the local database yet.'}\n\nWarnings: ${top.warnings || 'Check the official product label.'}\n\nPossible side effects: ${top.sideEffects || 'Check the official product label.'}`,
    safety: GENERAL_MEDICINE_SAFETY,
    sources: matches.map(m => m.reference.sourceDrugName),
    matchedMedicines: matches,
    generatedBy: 'local-rag-fallback',
  };
}
