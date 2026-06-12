# QVAC AI Integration: Smart Extraction + Medicine Helpdesk

This version removes the hardcoded result path for real user photos.

## Real scan path

1. User takes or uploads a medicine photo.
2. `src/services/qvacAdapter.ts` runs QVAC OCR on the image.
3. `src/services/qvacMedicineAI.ts` asks QVAC text AI to structure visible OCR text into fields:
   - brandName
   - genericName
   - strength
   - dosageForm
   - manufacturer
   - barcodeGtin
   - cprNumber
   - batchNumber / lotNumber
   - expirationDate
4. `src/services/medicineMatcher.ts` matches the extracted fields with the local 747-record medicine database.
5. Empty fields are auto-filled from the top database match.
6. `src/services/qvacMedicineAI.ts` can assess whether the matched medicine appears related to the user's concern using only local database evidence.

## Helpdesk path

The Helpdesk screen calls:

```ts
askMediScanHelpdesk(question)
```

It retrieves likely medicine records from the local database, sends the retrieved source text to QVAC AI, and returns a grounded answer. If QVAC text generation is not yet configured on the device, it falls back to local RAG-style answer construction so the prototype still runs.

## Safety rules

- The app must not diagnose.
- The app must not prescribe.
- The app must not give dosage instructions.
- Pill-only scans always require verification.
- The app answers only from local database records and tells users to verify with a pharmacist/doctor.

## Main files

- `src/services/qvacAdapter.ts` - QVAC OCR integration
- `src/services/qvacMedicineAI.ts` - QVAC text AI, helpdesk, suitability assessment
- `src/services/medicineMatcher.ts` - local database matching + auto-fill
- `src/services/scanPipeline.ts` - full scan pipeline
- `App.tsx` - UI screens

## Important note

QVAC text-generation model constants may change depending on the installed SDK/model package. The adapter uses a safe dynamic call and falls back locally if a text model is not configured. For the hackathon, once your team confirms the exact QVAC LLM model constant/function, update `runQvacText()` in `src/services/qvacMedicineAI.ts`.
