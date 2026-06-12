import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ImageSourcePropType, Pressable, SafeAreaView, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Card } from './src/components/Card';
import { StatusBadge } from './src/components/StatusBadge';
import { colors, radius, spacing } from './src/theme';
import { demoSamples, DemoSample } from './src/data/demoSamples';
import { getAllMedicineReferences, searchReferences } from './src/services/medicineMatcher';
import { assessExistingScanForConcern, runDemoScan, runImageScan, runManualTextScan } from './src/services/scanPipeline';
import { deleteVaultItem, getVaultItems, saveScanToVault } from './src/services/vaultStorage';
import { askMediScanHelpdesk } from './src/services/qvacMedicineAI';
import { HelpdeskAnswer, MedicineReference, ScanResult, UserMedicine } from './src/types/Medicine';

const Button = ({ title, onPress, variant = 'primary', disabled = false }: { title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean }) => {
  const bg = disabled ? colors.border : variant === 'primary' ? colors.primary : variant === 'danger' ? colors.redSoft : colors.blueSoft;
  const fg = disabled ? colors.muted : variant === 'primary' ? 'white' : variant === 'danger' ? colors.red : colors.primary;
  return <Pressable disabled={disabled} onPress={onPress} style={{ backgroundColor: bg, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', marginBottom: spacing.sm }}><Text style={{ color: fg, fontWeight: '800' }}>{title}</Text></Pressable>;
};

type Screen = 'home' | 'scan' | 'result' | 'database' | 'details' | 'helpdesk';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [vault, setVault] = useState<UserMedicine[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedVaultItem, setSelectedVaultItem] = useState<UserMedicine | null>(null);
  const [loading, setLoading] = useState(false);
  const [concern, setConcern] = useState('');
  const [manualText, setManualText] = useState('');

  async function refreshVault() {
    const items = await getVaultItems();
    setVault(items);
  }

  useEffect(() => { refreshVault(); }, []);

  async function handleDemo(sample: DemoSample) {
    setLoading(true);
    try {
      const result = await runDemoScan(sample, concern.trim() || undefined);
      setScanResult(result);
      setScreen('result');
    } finally { setLoading(false); }
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to test image scanning.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!picked.canceled) {
      setLoading(true);
      try {
        const result = await runImageScan(picked.assets[0].uri, 'photo', concern.trim() || undefined);
        setScanResult(result);
        setScreen('result');
      } finally { setLoading(false); }
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Please allow camera access so MediScan can scan medicine labels using QVAC OCR.');
      return;
    }
    const captured = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
    if (!captured.canceled) {
      setLoading(true);
      try {
        const result = await runImageScan(captured.assets[0].uri, 'photo', concern.trim() || undefined);
        setScanResult(result);
        setScreen('result');
      } finally { setLoading(false); }
    }
  }

  async function handleManualTextScan() {
    if (!manualText.trim()) {
      Alert.alert('Enter label text', 'Type or paste the visible medicine label text first. Example: Paracetamol 500 mg Tablet EXP 08/2026.');
      return;
    }
    setLoading(true);
    try {
      const result = await runManualTextScan(manualText.trim(), concern.trim() || undefined);
      setScanResult(result);
      setScreen('result');
    } finally { setLoading(false); }
  }

  async function assessCurrentScan(userConcern: string) {
    if (!scanResult || !userConcern.trim()) return;
    setLoading(true);
    try {
      const updated = await assessExistingScanForConcern(scanResult, userConcern.trim());
      setScanResult(updated);
    } finally { setLoading(false); }
  }

  async function saveCurrentScan() {
    if (!scanResult) return;
    await saveScanToVault(scanResult);
    await refreshVault();
    Alert.alert('Saved', 'Medicine saved to your vault.');
    setScreen('home');
  }

  async function removeVaultItem(item: UserMedicine) {
    await deleteVaultItem(item.userMedicineId);
    await refreshVault();
    setSelectedVaultItem(null);
    setScreen('home');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: StatusBar.currentHeight || 0 }}>
      <ExpoStatusBar style="dark" />
      <Header screen={screen} onHome={() => setScreen('home')} onScan={() => setScreen('scan')} onDatabase={() => setScreen('database')} onHelpdesk={() => setScreen('helpdesk')} />
      {loading && <View style={{ padding: spacing.md }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Running QVAC AI + local medicine RAG...</Text></View>}
      {screen === 'home' && <Home vault={vault} onScan={() => setScreen('scan')} onDatabase={() => setScreen('database')} onHelpdesk={() => setScreen('helpdesk')} onOpen={(item) => { setSelectedVaultItem(item); setScreen('details'); }} />}
      {screen === 'scan' && <Scan concern={concern} setConcern={setConcern} manualText={manualText} setManualText={setManualText} onDemo={handleDemo} onPickPhoto={pickPhoto} onTakePhoto={takePhoto} onManualText={handleManualTextScan} />}
      {screen === 'result' && scanResult && <Result result={scanResult} onSave={saveCurrentScan} onBack={() => setScreen('scan')} onAssess={assessCurrentScan} />}
      {screen === 'database' && <Database />}
      {screen === 'helpdesk' && <Helpdesk />}
      {screen === 'details' && selectedVaultItem && <Details item={selectedVaultItem} onBack={() => setScreen('home')} onDelete={() => removeVaultItem(selectedVaultItem)} />}
    </SafeAreaView>
  );
}

function Header({ screen, onHome, onScan, onDatabase, onHelpdesk }: { screen: Screen; onHome: () => void; onScan: () => void; onDatabase: () => void; onHelpdesk: () => void }) {
  return (
    <View style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
      <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primary }}>MediScan</Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>QVAC AI medicine scanner, matcher, and helpdesk</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: 8 }}>
        {[
          ['Vault', onHome, screen === 'home'],
          ['Scan', onScan, screen === 'scan' || screen === 'result'],
          ['Database', onDatabase, screen === 'database'],
          ['Helpdesk', onHelpdesk, screen === 'helpdesk'],
        ].map(([label, fn, active]) => <Pressable key={label as string} onPress={fn as () => void} style={{ backgroundColor: active ? colors.primary : colors.blueSoft, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill }}><Text style={{ color: active ? 'white' : colors.primary, fontWeight: '800' }}>{label as string}</Text></Pressable>)}
      </View>
    </View>
  );
}

function Home({ vault, onScan, onDatabase, onHelpdesk, onOpen }: { vault: UserMedicine[]; onScan: () => void; onDatabase: () => void; onHelpdesk: () => void; onOpen: (item: UserMedicine) => void }) {
  const stats = useMemo(() => ({ verified: vault.filter(v => v.scanStatus === 'Verified').length, need: vault.filter(v => v.scanStatus === 'Needs Verification').length, expired: vault.filter(v => v.scanStatus === 'Expired').length }), [vault]);
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Card style={{ backgroundColor: colors.primary }}>
        <Text style={{ color: 'white', fontWeight: '900', fontSize: 22 }}>Your Medicine Vault</Text>
        <Text style={{ color: '#DDE8FF', marginTop: 6 }}>QVAC reads the photo, the matcher fills missing fields from the local database, and the helpdesk answers from local medicine records.</Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.md }}>
        <Stat label="Verified" value={stats.verified} color={colors.green} />
        <Stat label="Needs check" value={stats.need} color={colors.orange} />
        <Stat label="Expired" value={stats.expired} color={colors.red} />
      </View>
      <Button title="Scan Medicine" onPress={onScan} />
      <Button title="Ask QVAC Helpdesk" onPress={onHelpdesk} variant="ghost" />
      <Button title="Browse Local Database" onPress={onDatabase} variant="ghost" />
      <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }}>Saved Medicines</Text>
      {vault.length === 0 ? <Card><Text style={{ color: colors.muted }}>No medicines saved yet. Try a real photo scan or a demo scan first.</Text></Card> : vault.map(item => <Pressable key={item.userMedicineId} onPress={() => onOpen(item)}><Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}><View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>{item.displayName}</Text><Text style={{ color: colors.muted, marginTop: 3 }}>{item.genericName || 'Unknown generic'} {item.strength ? `• ${item.strength}` : ''}</Text><Text style={{ color: colors.muted, marginTop: 3 }}>EXP: {item.expirationDate || 'Not detected'}</Text></View><StatusBadge status={item.scanStatus} /></View></Card></Pressable>)}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}><Text style={{ color, fontWeight: '900', fontSize: 24 }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text></View>;
}

function Scan({ concern, setConcern, manualText, setManualText, onDemo, onPickPhoto, onTakePhoto, onManualText }: { concern: string; setConcern: (v: string) => void; manualText: string; setManualText: (v: string) => void; onDemo: (sample: DemoSample) => void; onPickPhoto: () => void; onTakePhoto: () => void; onManualText: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>QVAC AI Scan</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>Real photos use QVAC OCR. Then QVAC/local AI structures fields, auto-fills missing info from the local database, and checks whether the medicine appears related to your concern.</Text>
        <TextInput value={concern} onChangeText={setConcern} placeholder="Optional: What are you checking it for? e.g., fever, allergy, cough" style={{ marginTop: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border }} />
      </Card>
      <Button title="Take Photo with QVAC OCR" onPress={onTakePhoto} />
      <Button title="Upload Photo with QVAC OCR" onPress={onPickPhoto} variant="ghost" />
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>If OCR is blank, paste visible label text</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>Use this to verify that the parser, medicine matcher, auto-fill, and helpdesk work while QVAC OCR is being tuned for your phone camera.</Text>
        <TextInput
          multiline
          value={manualText}
          onChangeText={setManualText}
          placeholder="Example: PARACETAMOL 500 mg Tablet EXP 08/2026"
          style={{ marginTop: spacing.md, minHeight: 90, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top' }}
        />
        <Button title="Process Typed Label Text" onPress={onManualText} variant="ghost" />
      </Card>
      <Text style={{ fontSize: 18, fontWeight: '900', marginVertical: spacing.md, color: colors.text }}>Optional demo photos</Text>
      {demoSamples.map(sample => (
        <Pressable key={sample.id} onPress={() => onDemo(sample)}>
          <Card>
            <Image source={sample.image as ImageSourcePropType} style={{ width: '100%', height: 170, borderRadius: radius.md, backgroundColor: colors.blueSoft }} resizeMode="cover" />
            <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, marginTop: spacing.sm }}>{sample.title}</Text>
            <Text style={{ color: colors.muted }}>{sample.subtitle}</Text>
            <Text style={{ color: colors.primary, marginTop: spacing.sm, fontWeight: '800' }}>Run scan →</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Result({ result, onSave, onBack, onAssess }: { result: ScanResult; onSave: () => void; onBack: () => void; onAssess: (concern: string) => void }) {
  const top = result.candidates[0]?.reference;
  const [localConcern, setLocalConcern] = useState(result.suitability?.userConcern || '');
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        {result.imageUri && <Image source={typeof result.imageUri === 'number' ? result.imageUri as ImageSourcePropType : { uri: result.imageUri as string }} style={{ width: '100%', height: 190, borderRadius: radius.md, marginBottom: spacing.md }} resizeMode="cover" />}
        <StatusBadge status={result.finalStatus} />
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginTop: spacing.md }}>{top?.brandName || top?.sourceDrugName || result.parsed.genericName || 'Unknown Medicine'}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{result.parsed.genericName || top?.genericName || 'Generic not detected'} {result.parsed.strength ? `• ${result.parsed.strength}` : ''}</Text>
        <Text style={{ color: colors.text, marginTop: spacing.md, fontWeight: '800' }}>Confidence: {result.confidenceScore}%</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>AI path: {result.qvacMode || 'QVAC OCR + local matcher'}</Text>
      </Card>
      <Info title="Extracted and auto-filled fields" rows={[
        ['Source', result.source], ['Generic', result.parsed.genericName || 'Not detected'], ['Strength', result.parsed.strength || 'Not detected'], ['Form', result.parsed.dosageForm || 'Not detected'], ['Manufacturer', result.parsed.manufacturer || 'Not detected'], ['Barcode', result.parsed.barcodeGtin || 'Not detected'], ['Expiration', result.parsed.expirationDate || 'Not detected'], ['Pill features', result.parsed.pillFeatures || 'N/A']
      ]} />
      {result.extractionSummary && <Card><Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>Field source summary</Text>{result.extractionSummary.map((s, i) => <Text key={`${s.field}-${i}`} style={{ color: colors.muted, marginTop: 5 }}>{String(s.field)}: {s.value} ({s.source})</Text>)}</Card>}
      <Card>
        <Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>QVAC OCR text</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>{result.parsed.rawText || 'No text detected'}</Text>
        {!!result.qvacNotes && <Text style={{ color: colors.primary, marginTop: 8, fontWeight: '700' }}>{result.qvacNotes}</Text>}
      </Card>
      <Card style={{ backgroundColor: result.finalStatus === 'Expired' ? colors.redSoft : result.finalStatus === 'Needs Verification' ? colors.orangeSoft : colors.greenSoft }}>
        <Text style={{ fontWeight: '900', color: colors.text }}>Safety note</Text>
        <Text style={{ color: colors.text, marginTop: 6 }}>{result.safetyWarning}</Text>
      </Card>
      {top && <Card><Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>Top database match</Text><Text style={{ color: colors.text, marginTop: 8 }}>{top.sourceDrugName}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>DPRI median price: ₱{top.medianPricePhp ?? 'N/A'}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>PH FDA status: {top.fdaRegistrationStatus}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Use: {top.commonUses}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Warnings: {top.warnings}</Text></Card>}
      <Card>
        <Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>Check if related to a sickness/concern</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>Example: fever, allergy, cough, diarrhea, acid reflux. MediScan will answer from the matched medicine record only.</Text>
        <TextInput value={localConcern} onChangeText={setLocalConcern} placeholder="What are you checking it for?" style={{ marginTop: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border }} />
        <Button title="Ask QVAC AI about this medicine" onPress={() => onAssess(localConcern)} disabled={!top || !localConcern.trim()} />
      </Card>
      {result.suitability && <Card style={{ backgroundColor: colors.blueSoft }}><Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>QVAC AI assessment</Text><Text style={{ color: colors.primary, marginTop: 6, fontWeight: '900' }}>{result.suitability.decision}</Text><Text style={{ color: colors.text, marginTop: 8 }}>{result.suitability.answer}</Text>{result.suitability.evidence.map((e, i) => <Text key={i} style={{ color: colors.muted, marginTop: 5 }}>• {e}</Text>)}<Text style={{ color: colors.red, marginTop: 8, fontWeight: '700' }}>{result.suitability.safety}</Text><Text style={{ color: colors.muted, marginTop: 6 }}>Generated by: {result.suitability.generatedBy}</Text></Card>}
      <Button title="Save to Vault" onPress={onSave} />
      <Button title="Back to Scan" onPress={onBack} variant="ghost" />
    </ScrollView>
  );
}

function Info({ title, rows }: { title: string; rows: [string, string][] }) {
  return <Card><Text style={{ fontWeight: '900', fontSize: 18, color: colors.text, marginBottom: spacing.sm }}>{title}</Text>{rows.map(([k, v]) => <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 5 }}><Text style={{ color: colors.muted, flex: 1 }}>{k}</Text><Text style={{ color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' }}>{v}</Text></View>)}</Card>;
}

function Database() {
  const [query, setQuery] = useState('');
  const results: MedicineReference[] = query ? searchReferences(query, 60) : getAllMedicineReferences().slice(0, 30);
  return <ScrollView contentContainerStyle={{ padding: spacing.md }}><Card><Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Local Medicine Database</Text><Text style={{ color: colors.muted, marginTop: 6 }}>747 DPRI records + enriched demo fields. This powers field auto-fill and the QVAC helpdesk RAG context.</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search paracetamol, allergy, fever..." style={{ marginTop: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border }} /></Card>{results.map(r => <Card key={r.id}><Text style={{ fontWeight: '900', color: colors.text }}>{r.sourceDrugName}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{r.genericName} • {r.dosageForm}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Use: {r.commonUses}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Price range: ₱{r.lowestPricePhp ?? 'N/A'} - ₱{r.highestPricePhp ?? 'N/A'}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>FDA CPR: {r.philippineFdaCprNumber || 'Needs manual PH FDA check'}</Text></Card>)}</ScrollView>;
}

function Helpdesk() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<HelpdeskAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const next = await askMediScanHelpdesk(question.trim());
      setAnswer(next);
    } finally { setLoading(false); }
  }

  return <ScrollView contentContainerStyle={{ padding: spacing.md }}>
    <Card>
      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>QVAC Medicine Helpdesk</Text>
      <Text style={{ color: colors.muted, marginTop: 6 }}>Ask about a medicine name, use, warning, or side effect. The answer is grounded on the local medicine database and should not be used as a prescription.</Text>
      <TextInput multiline value={question} onChangeText={setQuestion} placeholder="Example: Is paracetamol for fever? What are ibuprofen warnings?" style={{ marginTop: spacing.md, minHeight: 90, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top' }} />
      <Button title={loading ? 'Asking QVAC AI...' : 'Ask Helpdesk'} onPress={submit} disabled={loading || !question.trim()} />
    </Card>
    {answer && <Card style={{ backgroundColor: colors.blueSoft }}>
      <Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>Answer</Text>
      <Text style={{ color: colors.text, marginTop: 8 }}>{answer.answer}</Text>
      <Text style={{ color: colors.red, marginTop: 10, fontWeight: '700' }}>{answer.safety}</Text>
      <Text style={{ color: colors.muted, marginTop: 8 }}>Generated by: {answer.generatedBy}</Text>
    </Card>}
    {answer?.sources?.length ? <Card><Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>Local sources used</Text>{answer.sources.map((s, i) => <Text key={`${s}-${i}`} style={{ color: colors.muted, marginTop: 5 }}>• {s}</Text>)}</Card> : null}
  </ScrollView>;
}

function Details({ item, onBack, onDelete }: { item: UserMedicine; onBack: () => void; onDelete: () => void }) {
  return <ScrollView contentContainerStyle={{ padding: spacing.md }}><Card>{item.imageUri && <Image source={typeof item.imageUri === 'number' ? item.imageUri as ImageSourcePropType : { uri: item.imageUri as string }} style={{ width: '100%', height: 190, borderRadius: radius.md, marginBottom: spacing.md }} resizeMode="cover" />}<StatusBadge status={item.scanStatus} /><Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginTop: spacing.md }}>{item.displayName}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{item.genericName} {item.strength ? `• ${item.strength}` : ''}</Text></Card><Info title="Saved medicine details" rows={[[ 'Expiration', item.expirationDate || 'Not detected'], ['Source', item.scanSource], ['Confidence', `${item.confidenceScore}%`], ['Barcode', item.barcodeGtin || 'Not detected'], ['CPR', item.cprNumber || 'Needs manual PH FDA check'], ['Saved', item.savedAt.slice(0, 10)]]} /><Button title="Back to Vault" onPress={onBack} variant="ghost" /><Button title="Delete from Vault" onPress={() => Alert.alert('Delete medicine?', 'This removes the saved item from your vault.', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: onDelete }])} variant="danger" /></ScrollView>;
}
