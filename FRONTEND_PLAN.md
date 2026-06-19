# MediScan Vault — Frontend Plan

> **Purpose:** Screen-by-screen implementation spec. A fresh agent should read this file + [`DESIGN.md`](DESIGN.md) + [`tokens.css`](tokens.css) before building any screen.

**Reference images:** `docs/design_reference/ui_sample/1.jpg` … `8.jpg`  
**Figma:** [MediScan TABS](https://www.figma.com/design/rQEenGFR4OO0bqPJPMdJf7/MediScan?node-id=1-2) · [Assets](https://www.figma.com/design/rQEenGFR4OO0bqPJPMdJf7/MediScan?node-id=1-6)

---

## Global

### Navigation map

```
MainTabs (bottom tabs)
├── Home          → stack: MedicineDetails, Helpdesk, Database, FamilyProfiles
├── Scan          → stack: ChooseScanType → CameraCapture → ScanResult → MedicineDetails
├── Vault         → stack: MedicineDetails
├── Reminders     → stack: AddReminder, ReminderDetails
└── Profile       → stack: Settings*, Helpdesk, Database, FamilyProfiles

Root stack routes (see src/navigation/types.ts):
  ChooseScanType, CameraCapture, ScanResult, MedicineDetails,
  AddReminder, ReminderDetails, FamilyProfiles, FamilyMember,
  FamilyMemberMedicines, SettingsAppearance, SettingsBackup,
  SettingsLanguage, SettingsNotifications, Helpdesk, Database
```

### Shared components

Use from `src/components/`: `Screen`, `AppBar`, `Button`, `Card`, `StatusBadge`, `StatCard`, `FeatureTile`, `MedicineListItem`, `SearchBar`, `FilterChips`, `ConfidenceMeter`, `EmptyState`.

### Service wiring (do not break)

| Service | Exports used by UI |
|---------|-------------------|
| [`vaultStorage.ts`](src/services/vaultStorage.ts) | `getVaultItems`, `saveScanToVault`, `deleteVaultItem` |
| [`scanPipeline.ts`](src/services/scanPipeline.ts) | `runDemoScan`, `runImageScan`, `runManualTextScan`, `assessExistingScanForConcern` |
| [`medicineMatcher.ts`](src/services/medicineMatcher.ts) | `searchReferences`, `getAllMedicineReferences` |
| [`qvacMedicineAI.ts`](src/services/qvacMedicineAI.ts) | `askMediScanHelpdesk`, `assessMedicineForConcern` |
| [`status.ts`](src/services/status.ts) | `determineMedicineStatus`, `safetyWarningFor` |
| [`demoSamples.ts`](src/data/demoSamples.ts) | `demoSamples` for demo scan cards |

### Mock stores to create (when implementing [mock] screens)

| Store | Key | Used by |
|-------|-----|---------|
| Family profiles | `MEDISCAN_FAMILY_V1` | Family screens, assign-to-member |
| Reminders | `MEDISCAN_REMINDERS_V1` | Reminder Center |
| App settings | `MEDISCAN_SETTINGS_V1` | Appearance, language, notifications |
| Medicine notes/tags | extend `UserMedicine` or separate key | Medicine Details |

### Screen template (used below)

Each screen section includes: **Route** · **Reference** · **Layout** · **Components** · **Data** · **States** · **Interactions** · **Design notes** · **Acceptance**

---

## Home / Dashboard

- **Route:** Tab `Home` · File: `src/screens/home/HomeScreen.tsx`
- **Reference:** `ui_sample/1.jpg`
- **Layout (top → bottom):**
  1. AppBar — menu (left), MediScan Vault logo + tagline, notification bell (right)
  2. Greeting — "Hello, {name}!" + subtitle
  3. Quick Scan card — mint background, pill illustration, "Start Scanning" CTA
  4. Medicine Overview — 4× `StatCard`: Total, Verified, Needs Verification, Expiring Soon
  5. Recent Scans — section header + "View all" → Vault tab; list of 3 `MedicineListItem`
  6. Upcoming Reminders — section + "View all" → Reminders; 1–2 preview rows `[mock]`
  7. Family Profile selector — dropdown chip "Me" `[mock]`
- **Components:** `AppBar`, `StatCard`, `MedicineListItem`, `Button`, `Card`
- **Data:** `[wired]` `getVaultItems()` for stats, recent list; compute expiring from `expirationDate` client-side; `[mock]` reminders preview, family selector, user name from settings default "there"
- **States:** empty vault (show Quick Scan CTA only), loading skeleton, populated dashboard
- **Interactions:** Quick Scan → `ChooseScanType`; item tap → `MedicineDetails`; notification → Reminders tab
- **Design notes:** Quick Scan card uses `colors.brandLight` bg; stats use success/warning/danger tones; section titles `fontSizes.lg`
- **Acceptance:** Real vault counts; no invented metrics; matches reference hierarchy

---

## Choose Scan Type

- **Route:** Stack `ChooseScanType` · File: `src/screens/scan/ChooseScanTypeScreen.tsx`
- **Reference:** `ui_sample/2.jpg` (section A top)
- **Layout:**
  1. AppBar — back, title "Choose Scan Type", subtitle
  2. Four `FeatureTile` rows: Label/Box, Blister Pack, Barcode, Pill/Capsule
  3. Optional: demo samples section (preserve hackathon demo path)
  4. Manual text fallback card (preserve existing flow)
- **Components:** `AppBar`, `FeatureTile`, `Card`, `TextInput`, `Button`
- **Data:** `[wired]` static scan types map to `ScanSource`; demo via `demoSamples`
- **States:** default list
- **Interactions:** tile tap → `CameraCapture` with `{ scanType }`; demo → `runDemoScan` → `ScanResult`
- **Design notes:** Each tile has thumbnail/icon left; chevron right
- **Acceptance:** All 4 scan types navigable; demo + manual text still work

---

## Camera Capture

- **Route:** Stack `CameraCapture` · params `{ scanType: ScanSource }`
- **Reference:** `ui_sample/2.jpg` (camera mockups)
- **Layout:**
  1. Full-screen camera preview (`expo-camera`) or image picker fallback
  2. Top bar — back, scan type title, flash toggle
  3. Viewfinder overlay — corner brackets in `colors.brand`
  4. Bottom controls — gallery, shutter, flip camera
  5. Instruction text below shutter
- **Components:** custom camera chrome (no fake browser chrome)
- **Data:** `[wired]` `runImageScan(uri, scanType)` on capture; `[wired]` gallery via `expo-image-picker`
- **States:** permission denied, loading OCR, ready
- **Interactions:** shutter → pipeline → `ScanResult`; gallery pick → same
- **Design notes:** Dark overlay `#000` at 40% outside viewfinder; shutter white circle 72px
- **Acceptance:** Permissions handled; passes `scanType` to pipeline; concern field optional pre-scan

---

## Scan Result

- **Route:** Stack `ScanResult` · params `{ scanResult: ScanResult }`
- **Reference:** `ui_sample/2.jpg` (B), `ui_sample/7.jpg`
- **Layout variants:**
  - **Verified (≥85%):** green banner, medicine card, detail rows, `ConfidenceMeter`, Save + View Details
  - **Needs Verification (40–84%):** orange banner, possible matches list with similarity %
  - **Low Confidence (&lt;40%):** red banner, guidance to scan label/box
  - **Expired:** danger banner regardless of confidence
  1. Status banner (color by variant)
  2. Scanned image thumbnail
  3. Medicine name + generic + form
  4. Detail key-value rows OR possible matches list
  5. Safety note card (from `safetyWarningFor`)
  6. Concern assessment section (optional, wired to `assessExistingScanForConcern`)
  7. Actions: Save to Vault, View Details, Scan Again / Scan Label
- **Components:** `StatusBadge`, `ConfidenceMeter`, `Card`, `Button`, `MedicineListItem`
- **Data:** `[wired]` `ScanResult` param; `saveScanToVault`; concern via `assessExistingScanForConcern`
- **States:** loading assessment, saved confirmation
- **Interactions:** Save → vault + toast/alert; View Details → `MedicineDetails`; rescan → back to camera
- **Design notes:** Banner full-width; confidence badge pill; no fabricated match counts
- **Acceptance:** Three variants render correctly from real `finalStatus` + `confidenceScore`; pill scan always shows verification warning

---

## Medicine Details / Information

- **Route:** Stack `MedicineDetails` · params `{ userMedicineId? }` or `{ scanResult? }`
- **Reference:** `ui_sample/3.jpg`
- **Layout:**
  1. AppBar — back, "Medicine Details", overflow menu
  2. Hero — image, name, `StatusBadge`, "Scanned from {source}", confidence
  3. Info rows (icon + label + value): Generic, Type, Strength, Category, Uses, How to Use, Warnings (red), Manufacturer, Expiry, Storage
  4. Notes textarea `[mock persist]`
  5. Tags chips + Add Tag `[mock]`
  6. Assign to family member dropdown `[mock]`
  7. Sticky actions: Add Note (secondary), Save to Vault (primary) or Delete if already saved
- **Components:** `AppBar`, `StatusBadge`, `ConfidenceMeter`, `Card`, `Button`
- **Data:** `[wired]` vault item by id OR unsaved from `scanResult`; enrich from `candidates[0].reference` for uses/warnings; `[mock]` notes/tags/member assignment
- **States:** read-only saved item, editable pre-save, delete confirm
- **Interactions:** Save → `saveScanToVault`; Delete → `deleteVaultItem`; Share → RN Share API `[mock]`
- **Design notes:** Warnings row uses `colors.danger`; info icons from brand set or Ionicons
- **Acceptance:** All fields from reference shown when data exists; graceful "Not detected" fallbacks

---

## Medicine Vault

- **Route:** Tab `Vault` · File: `src/screens/vault/VaultScreen.tsx`
- **Reference:** `ui_sample/4.jpg`
- **Layout:**
  1. AppBar — menu, title, search + filter icons
  2. `SearchBar` full width
  3. `FilterChips` — All, Verified, Needs Verification, Expired, Expiring Soon
  4. Count line — "Total Medicines: N"
  5. Scrollable `MedicineListItem` list
  6. FAB or footer actions: Add Medicine, Export, Backup `[mock]`
- **Components:** `SearchBar`, `FilterChips`, `MedicineListItem`, `AppBar`
- **Data:** `[wired]` `getVaultItems()`; client-side filter/search/sort; `[mock]` export/backup
- **States:** empty vault, no search results, filtered empty
- **Interactions:** tap item → `MedicineDetails`; filter/sort; overflow → edit/delete
- **Design notes:** Active chip `colors.brand` fill; expired badge danger
- **Acceptance:** Search filters name/generic; status chips match `scanStatus`; sort by name/expiry/date added

---

## Family Profiles

- **Route:** Stack `FamilyProfiles` (from Home selector or Profile)
- **Reference:** `ui_sample/5.jpg` (screen 1)
- **Layout:**
  1. AppBar — back, title, add (+)
  2. Hero card — family illustration, "Manage medicines by family member"
  3. Profile list rows — avatar, name, medicine count, chevron
  4. Primary button — "+ Add Family Member"
- **Components:** `AppBar`, `Card`, `Button`, `FeatureTile`
- **Data:** `[mock]` AsyncStorage family store; seed "Me" member linked to vault
- **States:** empty (only Me), multi-member
- **Interactions:** row → `FamilyMember`; add → modal/form `[mock]`
- **Acceptance:** At least "Me" profile always present; counts reflect assigned medicines when assignment wired

---

## Family Member Overview

- **Route:** Stack `FamilyMember` · params `{ memberId }`
- **Reference:** `ui_sample/5.jpg` (screen 2)
- **Layout:** avatar + name + Edit; 4 stat cards; Upcoming Reminders; Recent Medicines; link to full list
- **Data:** `[mock]` filtered vault/reminders by memberId
- **Acceptance:** Stats match filtered data; "View all" → `FamilyMemberMedicines`

---

## Family Member Medicines

- **Route:** Stack `FamilyMemberMedicines` · params `{ memberId }`
- **Reference:** `ui_sample/5.jpg` (screen 3)
- **Layout:** same as Vault but scoped to member — search, chips, sort, list
- **Data:** `[mock]` filtered vault
- **Acceptance:** Reuses Vault components; title "{Name}'s Medicines"

---

## Reminder Center (tab)

- **Route:** Tab `Reminders` · File: `src/screens/reminders/RemindersScreen.tsx`
- **Reference:** `ui_sample/6.jpg` (dashboard)
- **Layout:**
  1. AppBar — menu, title, notification icon
  2. Alert summary row — 4 colored stat cards: Expired, Expiring Soon, Reminders Today, Total
  3. Expiring Soon section + list
  4. Expired section + list
  5. Link to "All Reminders" full list view (can be same screen scrolled or separate)
- **Components:** `StatCard`, `MedicineListItem`, `AppBar`
- **Data:** `[mock]` reminders store + derive expiry alerts from vault `[wired]` optional merge
- **Acceptance:** Color-coded sections match reference; tapping item → `ReminderDetails`

---

## All Reminders / Reminder List

- **Route:** Can be section on RemindersScreen or push route
- **Reference:** `ui_sample/6.jpg` (screen 2)
- **Layout:** filter chips (All, Medication Reminders, Expiry Alerts); grouped by date; time + medicine + instruction + bell icon; "+ Add Reminder" button
- **Data:** `[mock]` reminders store
- **Acceptance:** Groups by Today/Tomorrow; add navigates to `AddReminder`

---

## Reminder Details

- **Route:** Stack `ReminderDetails` · params `{ reminderId }`
- **Reference:** `ui_sample/6.jpg` (screen 3)
- **Layout:** medicine hero, expiry highlight, detail rows (time, frequency, start date, notes, assigned to), Edit + Delete buttons
- **Data:** `[mock]` reminder by id; link medicine from vault if `medicineId` set
- **Acceptance:** Delete confirms; edit navigates to form

---

## Add Reminder

- **Route:** Stack `AddReminder`
- **Reference:** derived from `ui_sample/6.jpg`
- **Layout:** form — medicine picker, time, frequency, notes, assign to member
- **Data:** `[mock]` create in reminders store
- **Acceptance:** Saves and appears in list

---

## Settings / Profile (tab)

- **Route:** Tab `Profile` · File: `src/screens/profile/ProfileScreen.tsx`
- **Reference:** `ui_sample/8.jpg` (main settings)
- **Layout:**
  1. User profile card row (avatar, name, email) `[mock]`
  2. Settings list rows: Appearance, Language, Offline Database, Backup, App Lock, Privacy, Notifications, Help, About
  3. Each row: icon, title, subtitle, chevron
- **Components:** `FeatureTile`, `AppBar`
- **Data:** `[mock]` settings store; `[wired]` navigate to Helpdesk, Database
- **Acceptance:** All rows from reference present; navigation to sub-screens works

---

## Settings — Appearance

- **Route:** `SettingsAppearance` · Reference: `ui_sample/8.jpg` screen 2
- **Layout:** theme cards (Light/Dark/System), text size slider, accent swatches, app icon row, preview card
- **Data:** `[mock]` persist to settings store
- **Acceptance:** Preview updates with selections; only Light theme required for hackathon MVP

---

## Settings — Backup & Restore

- **Route:** `SettingsBackup` · Reference: `ui_sample/8.jpg` screen 3
- **Layout:** Create Backup (primary), Restore (secondary), Auto Backup toggle, last backup timestamp
- **Data:** `[mock]` export vault JSON via `expo-file-system` / share sheet
- **Acceptance:** Backup file contains vault items JSON; restore merges/replaces with confirm

---

## Settings — Language / Notifications

- **Routes:** `SettingsLanguage`, `SettingsNotifications`
- **Reference:** `ui_sample/8.jpg` feature grid
- **Layout:** standard settings list / toggles
- **Data:** `[mock]`
- **Acceptance:** Selections persist locally

---

## QVAC Helpdesk

- **Route:** Stack `Helpdesk`
- **Reference:** existing prototype + `ui_sample/1.jpg` (supporting feature)
- **Layout:** question input, Ask button, answer card with safety disclaimer, sources list
- **Components:** `Card`, `Button`, `TextInput`
- **Data:** `[wired]` `askMediScanHelpdesk(question)`
- **Acceptance:** Preserves existing helpdesk behavior from old App.tsx; shows `generatedBy` and safety text

---

## Local Database Browser

- **Route:** Stack `Database`
- **Reference:** existing prototype
- **Layout:** search bar, result cards with drug name, generic, uses, price, FDA CPR
- **Data:** `[wired]` `searchReferences`, `getAllMedicineReferences`
- **Acceptance:** Same search behavior as old App.tsx Database screen

---

## Verification System (cross-cutting)

- **Reference:** `ui_sample/7.jpg`
- **Not a separate route** — implement as `ScanResult` variants + shared `StatusBadge` / banner components
- **Confidence thresholds:** Verified ≥85% display green; Needs 40–84%; Low &lt;40% (align UI with `determineMedicineStatus` in services for saved status; use confidence for banner copy on result screen)

---

## Implementation order (suggested)

1. **Scan flow** — ChooseScanType → CameraCapture → ScanResult (highest demo value)
2. **Home + Vault** — wired to vault storage
3. **Medicine Details** — save/delete flow
4. **Helpdesk + Database** — port from prototype
5. **Reminders + Family + Settings** — mock stores

---

## Agent quick-start

```text
Look at FRONTEND_PLAN.md, DESIGN.md, tokens.css — implement the Home screen.

Files to edit: src/screens/home/HomeScreen.tsx
Import: useTheme, components from src/components, getVaultItems from src/services/vaultStorage
Do not modify: src/services/* signatures
Run: npm run typecheck
```
