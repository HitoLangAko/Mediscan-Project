import { Platform } from 'react-native';
import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import * as Qvac from '@qvac/sdk';
import { DemoSample } from '../data/demoSamples';

export type QvacExtractionResult = {
  rawText: string;
  confidence: number;
  mode: 'mock-demo' | 'real-qvac' | 'manual-text' | 'qvac-unavailable';
  notes: string;
};

type OcrBlock = {
  text?: string;
  confidence?: number;
  bbox?: number[];
};

let ocrModelIdPromise: Promise<string> | null = null;

function getErrorMessage(error: any): string {
  const parts = [
    error?.message,
    error?.code ? `code=${error.code}` : '',
    error?.name ? `name=${error.name}` : '',
    error?.stack ? `stack=${String(error.stack).slice(0, 700)}` : '',
  ].filter(Boolean);
  return parts.join(' | ') || String(error || 'Unknown QVAC error');
}

async function getOcrModelId(): Promise<string> {
  if (!ocrModelIdPromise) {
    const qvac: any = Qvac as any;
    const modelSrc = qvac.OCR_LATIN_RECOGNIZER_1 || qvac.OCR_LATIN_RECOGNIZER || qvac.QVAC_OCR_MODEL;

    if (!qvac.loadModel) {
      throw new Error('QVAC loadModel() is not available. This usually means @qvac/sdk did not initialize on mobile.');
    }
    if (!modelSrc) {
      throw new Error('QVAC OCR model constant is missing. Expected OCR_LATIN_RECOGNIZER_1 from @qvac/sdk. Check @qvac/sdk version and qvac.config.json OCR plugin.');
    }

    // Match the official OCR example: load by modelSrc + OCR modelConfig.
    ocrModelIdPromise = qvac.loadModel({
      modelSrc,
      modelConfig: {
        langList: ['en'],
        useGPU: true,
        timeout: 30000,
        magRatio: 1.8,
        defaultRotationAngles: [90, 180, 270],
        contrastRetry: true,
        lowConfidenceThreshold: 0.25,
        recognizerBatchSize: 1,
      },
    });
  }
  return ocrModelIdPromise!;
}

async function normalizeImagePathForQvac(uri: string): Promise<string> {
  if (uri.startsWith('file://')) {
    return Platform.OS === 'web' ? uri : uri.replace('file://', '');
  }

  if (uri.startsWith('content://')) {
    const cacheDir = cacheDirectory || 'file:///tmp/';
    const target = `${cacheDir}mediscan-qvac-${Date.now()}.jpg`;
    await copyAsync({ from: uri, to: target });
    return target.replace('file://', '');
  }

  return uri;
}

function averageConfidence(blocks: OcrBlock[]): number {
  const scores = blocks
    .map(block => typeof block.confidence === 'number' ? block.confidence : undefined)
    .filter((value): value is number => value !== undefined);
  if (scores.length === 0) return blocks.length > 0 ? 0.75 : 0;
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return avg > 1 ? Math.min(avg / 100, 1) : Math.min(avg, 1);
}

function isPromiseLike(value: any): boolean {
  return Boolean(value && typeof value.then === 'function');
}

async function resolveMaybePromise<T = any>(value: any): Promise<T> {
  return isPromiseLike(value) ? await value : value;
}

function looksLikeUsefulOcrText(text: string): boolean {
  const cleaned = text.replace(/[^A-Za-z0-9]/g, '');
  return cleaned.length >= 3 && !/^(objectobject|true|false|null|undefined)$/i.test(cleaned);
}

function collectTextDeep(value: any, depth = 0, seen = new Set<any>()): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === 'string') return looksLikeUsefulOcrText(value) ? [value] : [];
  if (typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const results: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) results.push(...collectTextDeep(item, depth + 1, seen));
    return results;
  }

  for (const [key, child] of Object.entries(value)) {
    if (/path|uri|image|bbox|buffer|base64|model|id|confidence|score/i.test(key)) continue;
    results.push(...collectTextDeep(child, depth + 1, seen));
  }
  return results;
}

async function extractBlocksFromQvacOutput(output: any): Promise<OcrBlock[]> {
  const resolvedOutput = await resolveMaybePromise(output);
  const candidates = [
    resolvedOutput?.blocks,
    resolvedOutput?.textBlocks,
    resolvedOutput?.ocrBlocks,
    resolvedOutput?.result?.blocks,
    resolvedOutput?.data?.blocks,
    Array.isArray(resolvedOutput) ? resolvedOutput : undefined,
  ];

  for (const candidate of candidates) {
    const resolved = await resolveMaybePromise(candidate);
    if (Array.isArray(resolved)) {
      return resolved.map((item: any) => ({
        text: typeof item === 'string' ? item : item?.text || item?.value || item?.content,
        confidence: item?.confidence,
        bbox: item?.bbox,
      })).filter((block: OcrBlock) => looksLikeUsefulOcrText(block.text || ''));
    }
  }

  const deepTexts = collectTextDeep(resolvedOutput);
  return Array.from(new Set(deepTexts)).map(text => ({ text, confidence: 0.55 }));
}

export async function extractFromUserImage(uri: string): Promise<QvacExtractionResult> {
  try {
    const qvac: any = Qvac as any;
    const modelId = await getOcrModelId();
    const image = await normalizeImagePathForQvac(uri);

    if (typeof qvac.ocr !== 'function') {
      throw new Error('qvac.ocr() is not available in this installed SDK version.');
    }

    const ocrOutput: any = qvac.ocr({
      modelId,
      image,
      options: { paragraph: false, rotationAngles: [90, 180, 270] },
    });

    const blocks = await extractBlocksFromQvacOutput(ocrOutput);
    const rawText = blocks
      .map(block => block.text || '')
      .filter(Boolean)
      .join('\n')
      .replace(/[\t ]+/g, ' ')
      .trim();

    return {
      rawText,
      confidence: averageConfidence(blocks),
      mode: 'real-qvac',
      notes: rawText
        ? `Real QVAC OCR processed ${blocks.length} text block(s).`
        : 'Real QVAC OCR initialized and ran, but no readable text was found. Use a clearer label photo or the manual text scan fallback.',
    };
  } catch (error: any) {
    const details = getErrorMessage(error);
    console.error('[MediScan][QVAC OCR failed]', details);
    return {
      rawText: '',
      confidence: 0,
      mode: 'qvac-unavailable',
      notes: `QVAC OCR failed before reading the photo: ${details}`,
    };
  }
}

export async function extractFromManualText(text: string): Promise<QvacExtractionResult> {
  return {
    rawText: text.trim(),
    confidence: 0.88,
    mode: 'manual-text',
    notes: 'Manual visible-label text was processed through the same parser, database matcher, and helpdesk logic.',
  };
}

export async function unloadQvacOcrModel(): Promise<void> {
  if (!ocrModelIdPromise) return;
  try {
    const qvac: any = Qvac as any;
    const modelId = await ocrModelIdPromise;
    if (typeof qvac.unloadModel === 'function') {
      await qvac.unloadModel({ modelId, clearStorage: false });
    }
  } finally {
    ocrModelIdPromise = null;
  }
}

export async function extractFromDemoSample(sample: DemoSample): Promise<QvacExtractionResult> {
  await new Promise(resolve => setTimeout(resolve, 350));
  return {
    rawText: sample.mockOcrText,
    confidence: sample.source === 'pill' ? 0.55 : 0.92,
    mode: 'mock-demo',
    notes: 'Bundled demo image uses sample OCR text. Use Take Photo or Upload Photo for real QVAC OCR.',
  };
}
