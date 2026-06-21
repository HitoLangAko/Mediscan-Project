import { daysUntilExpiry, isExpired } from '../utils/date';
import { getVaultItems } from './vaultStorage';
import { askMediScanHelpdesk } from './qvacMedicineAI';
import { findMatches, getAllMedicineReferences } from './medicineMatcher';
import { parseScanText } from './parseScanText';
import { CandidateMatch, MedicineReference, ParsedScan, UserMedicine } from '../types/Medicine';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  generatedBy?: 'qvac-ai' | 'local-rag-fallback' | 'vault-local';
  sources?: string[];
};

const GENERAL_MEDICINE_SAFETY =
  'I can guide you with general medicine information, but I cannot diagnose or prescribe. Please confirm with the product label, pharmacist, or doctor before taking or changing any medicine.';

const MEDIASSIST_PERSONA =
  'You are MediAssist, a warm medicine companion inside MediScan. Speak like a caring pharmacist friend: concise, reassuring, plain-language, and grounded in the user scan history and local medicine database. Reference saved medicines naturally when relevant. For broad symptom questions, answer by medicine category first instead of defaulting to one medicine name like paracetamol. Mention a specific scanned medicine only when it is clearly relevant. Suggest medicine categories for symptoms as general guidance, never as a prescription.';

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createChatMessage(role: ChatRole, text: string): ChatMessage {
  return {
    id: id(role === 'user' ? 'chat-user' : 'chat-assistant'),
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

export function getInitialChatMessages(): ChatMessage[] {
  return [
    {
      ...createChatMessage(
        'assistant',
        "Hi, I'm MediAssist. I remember the medicines you scan, so you can ask me about your saved meds, expiry dates, side effects, or what type of medicine is usually used for a symptom.",
      ),
      generatedBy: 'local-rag-fallback',
    },
  ];
}

export async function sendChatMessage(question: string): Promise<ChatMessage> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      ...createChatMessage('assistant', 'Please type a medicine question first.'),
      generatedBy: 'local-rag-fallback',
    };
  }

  const smallTalkAnswer = answerSmallTalk(trimmed);
  if (smallTalkAnswer) {
    return {
      ...createChatMessage('assistant', smallTalkAnswer),
      generatedBy: 'local-rag-fallback',
    };
  }

  const vaultAnswer = await answerFromVault(trimmed);
  if (vaultAnswer) {
    return {
      ...createChatMessage('assistant', vaultAnswer),
      generatedBy: 'vault-local',
      sources: ['Saved vault'],
    };
  }

  const symptomCategory = getSymptomCategory(normalize(trimmed));
  const identificationAnswer = await answerMedicineIdentification(trimmed, Boolean(symptomCategory));
  if (identificationAnswer) {
    return {
      ...createChatMessage('assistant', identificationAnswer.text),
      generatedBy: identificationAnswer.generatedBy,
      sources: identificationAnswer.sources,
    };
  }

  const savedContext = await buildSavedContext();
  const answer = await askMediScanHelpdesk(trimmed, {
    savedContext,
    preferCategoryAnswer: Boolean(symptomCategory),
  });
  if (answer.generatedBy === 'qvac-ai') {
    return {
      ...createChatMessage(
        'assistant',
        `${answer.answer}\n\n${answer.safety || GENERAL_MEDICINE_SAFETY}`,
      ),
      generatedBy: answer.generatedBy,
      sources: answer.sources,
    };
  }

  const symptomAnswer = symptomCategory ? await answerFromSymptomCategory(trimmed) : null;
  if (symptomAnswer) {
    return {
      ...createChatMessage('assistant', symptomAnswer),
      generatedBy: 'local-rag-fallback',
      sources: ['Symptom category guide', 'Saved vault'],
    };
  }

  return {
    ...createChatMessage(
      'assistant',
      `${answer.answer}\n\n${answer.safety || GENERAL_MEDICINE_SAFETY}`,
    ),
    generatedBy: answer.generatedBy,
    sources: answer.sources,
  };
}

async function answerMedicineIdentification(
  message: string,
  hasSymptomCategory: boolean,
): Promise<{ text: string; generatedBy: 'local-rag-fallback' | 'vault-local'; sources: string[] } | null> {
  const normalized = normalize(message);
  const parsed = parseScanText(message);
  const hasLabelSignal = hasMedicineIdentificationSignal(message, parsed);

  if (hasSymptomCategory && !hasLabelSignal) {
    return null;
  }

  const savedMatch = await findSavedMedicineMatch(normalized);
  if (savedMatch) {
    return {
      text: `I think you're asking about your saved medicine: ${compactVaultItem(savedMatch)}. Is that the one you mean?\n\n${GENERAL_MEDICINE_SAFETY}`,
      generatedBy: 'vault-local',
      sources: ['Saved vault'],
    };
  }

  if (!hasLabelSignal) {
    return null;
  }

  const candidates = findMatches({ ...parsed, rawText: message });
  if (candidates.length === 0) {
    return {
      text: "I couldn't confidently identify a medicine from that input yet. Try giving me any visible name, strength like 500 mg, form like tablet or syrup, barcode, CPR number, or a few more words from the label.",
      generatedBy: 'local-rag-fallback',
      sources: ['Local medicine database'],
    };
  }

  return {
    text: buildIdentificationAnswer(candidates, parsed),
    generatedBy: 'local-rag-fallback',
    sources: candidates.map((candidate) => candidate.reference.sourceDrugName),
  };
}

async function findSavedMedicineMatch(normalized: string): Promise<UserMedicine | null> {
  const vault = await getVaultItems();
  if (vault.length === 0) return null;

  const matches = vault
    .map((item) => {
      const haystack = normalize(`${item.displayName} ${item.genericName} ${item.strength} ${item.dosageForm} ${item.barcodeGtin} ${item.cprNumber}`);
      const score = scoreTextOverlap(normalized, haystack);
      return { item, score };
    })
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.item || null;
}

function buildIdentificationAnswer(candidates: CandidateMatch[], parsed: ParsedScan): string {
  const [top, second] = candidates;
  const topName = formatReferenceName(top.reference);
  const detail = formatReferenceDetail(top.reference);
  const evidence = top.reasons.length > 0 ? `Matched because: ${top.reasons.slice(0, 2).join(', ')}.` : '';

  const closeCandidates = candidates.filter((candidate) => top.score - candidate.score <= 12).slice(0, 3);
  if (closeCandidates.length > 1 || top.score < 55 || (second && top.score - second.score < 10)) {
    const list = closeCandidates
      .map((candidate, index) => `${index + 1}. ${formatReferenceName(candidate.reference)} (${candidate.score}% match)`)
      .join('\n');
    return `I found a few possible medicines, but I want to confirm before I explain the wrong one:\n\n${list}\n\nWhich one matches your label? If none, send more label text like the brand, generic name, strength, or barcode.`;
  }

  const confidence = top.score >= 75 ? 'I think this is' : 'This might be';
  const detected = [
    parsed.genericName ? `generic: ${parsed.genericName}` : undefined,
    parsed.strength ? `strength: ${parsed.strength}` : undefined,
    parsed.dosageForm ? `form: ${parsed.dosageForm}` : undefined,
    parsed.barcodeGtin ? `barcode: ${parsed.barcodeGtin}` : undefined,
  ].filter(Boolean);
  const detectedLine = detected.length > 0 ? `\n\nFrom your input I detected: ${detected.join(', ')}.` : '';

  return `${confidence} ${topName}${detail ? `, ${detail}` : ''}. Is that the medicine you're asking about?${detectedLine}\n\n${evidence}\n\nOnce you confirm, I can explain what it's commonly used for, warnings, side effects, or whether it matches a symptom.`;
}

function hasMedicineIdentificationSignal(message: string, parsed: ParsedScan): boolean {
  const normalized = normalize(message);
  const hasParsedSignal = Boolean(parsed.genericName || parsed.brandName || parsed.barcodeGtin || parsed.cprNumber);
  const hasStrength = /\b\d+(?:\.\d+)?\s?(mg|mcg|g|ml|iu|units|%)\b/i.test(message);
  const asksToIdentify = [
    'what medicine',
    'what med',
    'identify',
    'what is this',
    'label says',
    'scan says',
    'medicine is',
    'med is',
  ].some((phrase) => normalized.includes(phrase));

  return hasParsedSignal || hasStrength || asksToIdentify;
}

function scoreTextOverlap(query: string, haystack: string): number {
  const queryTokens = query.split(' ').filter((token) => token.length > 2);
  return queryTokens.filter((token) => haystack.includes(token)).length;
}

function formatReferenceName(ref: MedicineReference): string {
  return ref.brandName || ref.sourceDrugName || ref.genericName;
}

function formatReferenceDetail(ref: MedicineReference): string {
  return [ref.genericName, ref.strength, ref.dosageForm].filter(Boolean).join(', ');
}

async function answerFromVault(question: string): Promise<string | null> {
  const vault = await getVaultItems();
  const normalized = normalize(question);

  if (!isVaultQuestion(normalized)) return null;

  if (vault.length === 0) {
    return `You do not have any medicines saved in your vault yet.\n\n${GENERAL_MEDICINE_SAFETY}`;
  }

  if (asksAboutExpiry(normalized)) {
    return buildExpiryAnswer(vault);
  }

  if (asksAboutInteractions(normalized)) {
    return buildInteractionAnswer(vault);
  }

  return buildVaultListAnswer(vault);
}

async function buildSavedContext(): Promise<string> {
  const vault = await getVaultItems();
  if (vault.length === 0) {
    return `${MEDIASSIST_PERSONA}\nThe user has no saved scan history yet. If the question depends on their medicines, warmly mention that they can scan a medicine so you can remember it.`;
  }

  const savedNames = vault
    .slice(0, 8)
    .map((item) => compactVaultItem(item))
    .join('; ');

  return `${MEDIASSIST_PERSONA}\nTreat these saved medicines as your own memory. Do not ask the user to re-describe them. If several saved medicines could fit, briefly name them and ask which one they mean.\nSaved medicines: ${savedNames}.`;
}

function buildVaultListAnswer(vault: UserMedicine[]): string {
  const lines = vault.slice(0, 10).map((item, index) => `${index + 1}. ${compactVaultItem(item)}`);
  const hiddenCount = vault.length - lines.length;
  const more = hiddenCount > 0 ? `\n\nAnd ${hiddenCount} more saved medicine(s).` : '';

  return `I remember these from your saved scans:\n\n${lines.join('\n')}${more}\n\nIf you mean one specific medicine, tell me which one and I can help you understand it. ${GENERAL_MEDICINE_SAFETY}`;
}

function buildExpiryAnswer(vault: UserMedicine[]): string {
  const expired = vault.filter((item) => isExpired(item.expirationDate));
  const expiringSoon = vault.filter((item) => {
    const days = daysUntilExpiry(item.expirationDate);
    return days !== undefined && days >= 0 && days <= 30;
  });

  const sections: string[] = [];
  if (expired.length > 0) {
    sections.push(`Expired:\n${expired.map((item) => `- ${compactVaultItem(item)}`).join('\n')}`);
  }
  if (expiringSoon.length > 0) {
    sections.push(`Expiring within 30 days:\n${expiringSoon.map((item) => `- ${compactVaultItem(item)}`).join('\n')}`);
  }
  if (sections.length === 0) {
    sections.push('I do not see anything in your saved scans that is expired or expiring within 30 days.');
  }

  return `${sections.join('\n\n')}\n\nPlease do not use expired medicine unless a pharmacist or doctor confirms it is safe.`;
}

function buildInteractionAnswer(vault: UserMedicine[]): string {
  const refsById = new Map(getAllMedicineReferences().map((ref) => [ref.id, ref]));
  const matched = vault
    .map((item) => ({ item, ref: item.referenceId ? refsById.get(item.referenceId) : undefined }))
    .filter((entry): entry is { item: UserMedicine; ref: MedicineReference } => Boolean(entry.ref));

  if (matched.length === 0) {
    return `I can see your saved medicines, but none are linked to a detailed local reference record for interaction notes yet. If you can, re-scan the label or enter the medicine name manually so I can match it better.\n\n${GENERAL_MEDICINE_SAFETY}`;
  }

  const lines = matched.map(({ item, ref }) => {
    const interactions = ref.drugInteractions || 'No interaction details are available in the local record.';
    return `- ${item.displayName}: ${interactions}`;
  });

  return `I cannot confirm drug interactions, but these are the local database interaction notes for saved medicines:\n\n${lines.join('\n')}\n\nAsk a pharmacist or doctor to check combinations, supplements, allergies, pregnancy, chronic conditions, and duplicate ingredients.`;
}

async function answerFromSymptomCategory(question: string): Promise<string | null> {
  const normalized = normalize(question);
  const category = getSymptomCategory(normalized);
  if (!category) return null;

  const vault = await getVaultItems();
  const relevantSaved = vault.filter((item) => {
    const text = normalize(`${item.displayName} ${item.genericName} ${item.dosageForm}`);
    return category.savedKeywords.some((keyword) => text.includes(keyword));
  });
  const savedLine = relevantSaved.length > 0
    ? ` I also see you have scanned ${relevantSaved.map((item) => item.displayName).join(', ')} before, which may be related to this category.`
    : vault.length === 0
      ? " It looks like you have not scanned any medicines yet, but once you do, I'll remember them for next time."
      : '';

  return `${category.answer}${savedLine}\n\n${GENERAL_MEDICINE_SAFETY}`;
}

function getSymptomCategory(normalized: string): {
  answer: string;
  savedKeywords: string[];
} | null {
  const groups: Array<{ terms: string[]; answer: string; savedKeywords: string[] }> = [
    {
      terms: ['allergy', 'allergies', 'sneezing', 'runny nose', 'hives', 'itchy'],
      answer: 'For allergy symptoms, the medicine type commonly used is an antihistamine. These help calm histamine, the body chemical that causes sneezing, itching, runny nose, or hives.',
      savedKeywords: ['cetirizine', 'loratadine', 'antihistamine'],
    },
    {
      terms: ['heartburn', 'acid', 'hyperacidity', 'reflux', 'indigestion'],
      answer: 'For heartburn or acid reflux, people commonly use antacids for quick relief, or acid reducers such as H2 blockers or proton pump inhibitors for longer control.',
      savedKeywords: ['antacid', 'omeprazole', 'pantoprazole', 'famotidine'],
    },
    {
      terms: ['fever', 'lagnat', 'temperature'],
      answer: 'For fever, the medicine category commonly used is an antipyretic, which simply means fever reducer. Some pain relievers also lower fever, but the safest choice depends on age, other conditions, allergies, and what else the person is taking.',
      savedKeywords: ['paracetamol', 'acetaminophen', 'ibuprofen'],
    },
    {
      terms: ['pain', 'headache', 'body pain', 'toothache', 'sakit', 'inflammation', 'swelling'],
      answer: 'For pain, people commonly use analgesics, which means pain relievers. If there is swelling or inflammation, doctors may suggest an NSAID, but this type needs extra care if you have stomach ulcers, kidney disease, blood thinners, pregnancy, or asthma sensitivity.',
      savedKeywords: ['paracetamol', 'acetaminophen', 'ibuprofen', 'naproxen', 'mefenamic'],
    },
    {
      terms: ['cough', 'ubo', 'phlegm', 'mucus'],
      answer: 'For cough, the helpful type depends on the cough. Expectorants are commonly used for phlegm or mucus, while cough suppressants are used for a dry cough that keeps you from resting.',
      savedKeywords: ['guaifenesin', 'dextromethorphan', 'ambroxol'],
    },
    {
      terms: ['diarrhea', 'lbm', 'loose stool'],
      answer: 'For diarrhea, the first priority is fluids and oral rehydration salts. Anti-diarrheal medicines may help some cases, but fever, blood in stool, dehydration, or diarrhea in children needs medical advice quickly.',
      savedKeywords: ['oral rehydration', 'loperamide', 'zinc'],
    },
  ];

  const match = groups.find((group) => group.terms.some((term) => normalized.includes(term)));
  return match ? { answer: match.answer, savedKeywords: match.savedKeywords } : null;
}

function compactVaultItem(item: UserMedicine): string {
  const parts = [
    item.displayName,
    item.strength,
    item.dosageForm,
    item.expirationDate ? `expires ${item.expirationDate}` : undefined,
    item.scanStatus ? `status ${item.scanStatus}` : undefined,
  ].filter(Boolean);

  return parts.join(', ');
}

function isVaultQuestion(normalized: string): boolean {
  const vaultWords = ['vault', 'saved', 'my medicine', 'my medicines', 'what medicine', 'what medicines', 'do i have', 'have saved'];
  return vaultWords.some((word) => normalized.includes(word)) || asksAboutExpiry(normalized) || asksAboutInteractions(normalized);
}

function asksAboutExpiry(normalized: string): boolean {
  return ['expired', 'expiry', 'expiration', 'expire', 'expiring'].some((word) => normalized.includes(word));
}

function asksAboutInteractions(normalized: string): boolean {
  return ['interaction', 'interactions', 'mix', 'combine', 'together', 'supplement'].some((word) => normalized.includes(word));
}

function answerSmallTalk(message: string): string | null {
  const normalized = normalize(message);
  const compact = normalized.replace(/\s+/g, ' ');

  if (['hi', 'hello', 'hey', 'helo', 'yo', 'good morning', 'good afternoon', 'good evening'].includes(compact)) {
    return "Hi, I'm here. You can ask me about your scanned medicines, expiry dates, side effects, or what type of medicine is usually used for a symptom.";
  }

  if (['thanks', 'thank you', 'ty', 'salamat'].includes(compact)) {
    return "You're welcome. I'm glad to help. Keep your medicine label nearby when checking anything important.";
  }

  if (['who are you', 'what are you', 'what can you do'].includes(compact)) {
    return "I'm MediAssist, your medicine companion inside MediScan. I can remember your scanned medicines, explain common uses and warnings, check saved expiry info, and guide you on general medicine categories.";
  }

  if (['how are you', 'how r u', 'kamusta'].includes(compact)) {
    return "I'm doing okay and ready to help. What medicine or symptom do you want to talk about?";
  }

  return null;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
