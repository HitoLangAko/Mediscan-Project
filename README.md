# MediScan

MediScan is an **offline-first medicinal assistant**. It helps a citizen scan a medicine label (or paste text), identify likely medicine records from a local database, show safety-focused context, and save results in a personal vault.

> Safety: MediScan is an information support tool, not a diagnosis or prescription tool.

## What the app should do

1. Identify pills, medicine labels, and medicine-related packaging from camera/gallery/manual text.
2. Explain likely use-case scenarios (for example: fever, allergy, cough) with clear safety warnings.
3. Show supplementary details a patient should read: warnings, side effects, interactions, and expiration status.
4. Work with weak or zero internet connection by relying on local models and local reference data.

---

## Current progress (codebase assessment)

### Implemented now

- Offline mobile app (Expo + React Native)
- Camera/gallery/manual text scan entry points
- QVAC OCR integration with local fallback path
- Medicine parsing + matching against local reference records
- Scan status classification: `Verified`, `Needs Verification`, `Expired`
- Local medicine vault save/delete
- Local searchable medicine database view
- Local helpdesk-style Q&A grounded on local records

### Current data/assets

- Local reference records: **747**
- Enriched demo records: **19**
- Demo scan samples for label/box/blister/pill-only scenarios

### Gaps right now

- No formal benchmark dataset for OCR/extraction/matching quality
- No model evaluation dashboard (no tracked precision/recall trend yet)
- No automated test suite for scanning pipeline quality
- No backend sync, account system, or clinician workflow integration
- No release-hardening features (telemetry, incident pipeline, signed update channel)

### Practical progress score

This is a direct product-readiness estimate based on implemented vs missing pillars:

- **Prototype completeness:** ~70% (core flow works end-to-end)
- **MVP readiness:** ~45% (needs measurable quality gates and curated datasets)
- **Production readiness:** ~20% (needs reliability, compliance, and operations layers)

---

## Ideal target state (specific)

The ideal MediScan release should provide:

1. **High-confidence identification pipeline** for common medicine formats (label, blister, box, pill imprint).
2. **Strict safety-first responses** with explicit escalation rules (“ask pharmacist/doctor now”).
3. **Measured quality** with public internal scorecards per release.
4. **Offline reliability** on target low/mid-range devices.
5. **Traceable updates** for model/data versions and decision logic.

---

## Use-case scenarios the app must support

1. **“I have fever, is this medicine relevant?”**  
   App should show likely use match, warnings, and when to seek professional care.

2. **“Is this medicine expired?”**  
   App should parse expiration and clearly label unsafe status.

3. **“I found a loose pill with no box.”**  
   App should mark low confidence and force manual verification path.

4. **“I want to compare options in my local pharmacy context.”**  
   App should show local reference fields including known price ranges and safety notes.

---

## Metrics to quantify model/system quality

Yes — **recall is required**. Use the following metrics set:

### 1) OCR quality
- **CER (Character Error Rate)**: lower is better.
- **WER (Word Error Rate)**: lower is better.

### 2) Field extraction quality (generic name, strength, dosage form, expiry, etc.)
- **Precision**: among extracted fields, how many are correct.
- **Recall**: among true fields present on label, how many are captured.
- **F1-score**: balance of precision and recall.
- **Exact-match rate** per field.

### 3) Medicine matching quality (retrieval/ranking)
- **Top-1 accuracy**: correct medicine is first result.
- **Top-3 recall**: correct medicine appears in top 3 candidates.
- **MRR (Mean Reciprocal Rank)**: ranking quality summary.

### 4) Safety classification quality (`Verified` / `Needs Verification` / `Expired`)
- **Confusion matrix**
- **Per-class precision/recall**
- Priority metric: **Recall for “Expired” and “Needs Verification”** (missing unsafe cases is high risk).

### 5) End-user task quality
- **Task success rate** (user reaches correct medicine decision path)
- **Time-to-result** (scan to answer latency)
- **Unsafe recommendation rate** (must be near zero)

---

## MVP requirements (minimum viable product)

To reach MVP, gather and complete:

1. **Evaluation dataset**
   - At least 1,500 labeled medicine images/text samples across common Philippine market medicines.
   - Balanced by label quality, lighting, language variants, and packaging type.

2. **Ground-truth annotations**
   - Correct fields: generic, brand, strength, dosage form, expiry, barcode/CPR when visible.
   - Gold-label for use-case intent categories (fever/allergy/cough/etc.).

3. **Quality gates**
   - Minimum metric thresholds (set and enforced in release checklist).
   - Failure policy: auto-fallback to “Needs Verification” when uncertainty is high.

4. **Core product safeguards**
   - Clear medical disclaimer in all advice surfaces.
   - Explicit emergency/escalation messaging for severe symptoms.
   - Deterministic offline behavior when model is unavailable.

5. **Basic QA matrix**
   - Real-device tests on at least 6 Android device profiles.
   - Repeatability checks for OCR and matching outputs.

---

## Production-grade requirements

For production, gather and implement:

1. **Larger and continuously updated dataset**
   - 10,000+ validated samples with periodic refresh.
   - Versioned data packs and rollback support.

2. **Operational quality system**
   - Automated regression benchmarks per release.
   - Drift monitoring between releases and real-world usage patterns.
   - Structured error taxonomy (OCR fail, extraction fail, retrieval fail, safety fail).

3. **Safety and governance**
   - Formal clinical/pharmacy review loop for high-impact content.
   - Regulatory/legal review for medical information boundaries.
   - Audit trail of model/data versions used for each answer.

4. **Reliability engineering**
   - Crash-free session target, startup target, p95 inference latency target.
   - Secure local storage hardening and update integrity checks.
   - Incident response runbook for incorrect/unsafe outputs.

5. **Human-centered validation**
   - Usability studies with non-technical users.
   - Accessibility checks (font size, contrast, language clarity).
   - Post-release feedback loop tied to metric improvements.

---

## Local run (developer quick start)

```bash
npm install
npm run typecheck
npm run android
```

For QVAC native setup and platform-specific details, see:

- `docs/QVAC_REAL_OCR_SETUP.md`
- `docs/WINDOWS_QVAC_ECOMPROMISED_FIX.md` (Windows lock-compromised fix guide)

---

## Disclaimer

MediScan does not diagnose disease, prescribe treatment, or replace licensed medical professionals. Always verify with a pharmacist or doctor before taking any medicine.
