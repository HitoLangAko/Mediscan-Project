import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { AppBar } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { getAllMedicineReferences, searchReferences } from '../../services/medicineMatcher';
import { useTheme } from '../../theme/ThemeProvider';
import { MedicineReference } from '../../types/Medicine';
import { StackProps } from '../_shared/ScreenStub';

function formatPrice(value: number | null): string {
  return value != null ? `₱${value}` : 'N/A';
}

function DatabaseResultCard({ reference }: { reference: MedicineReference }) {
  const { colors, fonts, fontSizes, spacing } = useTheme();

  return (
    <Card>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.text }}>
        {reference.sourceDrugName}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: fontSizes.sm,
          color: colors.textMuted,
          marginTop: spacing.xs,
        }}
      >
        {reference.genericName} · {reference.dosageForm}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: fontSizes.sm,
          color: colors.textMuted,
          marginTop: spacing.xs,
        }}
      >
        Use: {reference.commonUses || '—'}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: fontSizes.sm,
          color: colors.textMuted,
          marginTop: spacing.xs,
        }}
      >
        Price range: {formatPrice(reference.lowestPricePhp)} – {formatPrice(reference.highestPricePhp)}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: fontSizes.sm,
          color: colors.textMuted,
          marginTop: spacing.xs,
        }}
      >
        FDA CPR: {reference.philippineFdaCprNumber || 'Needs manual PH FDA check'}
      </Text>
    </Card>
  );
}

export function DatabaseScreen({ navigation }: StackProps<'Database'>) {
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => (query.trim() ? searchReferences(query, 60) : getAllMedicineReferences().slice(0, 30)),
    [query],
  );

  const hasQuery = Boolean(query.trim());
  const hasNoResults = hasQuery && results.length === 0;

  return (
    <Screen>
      <AppBar title="Local Database" showBack onBack={() => navigation.goBack()} />

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search paracetamol, allergy, fever…"
      />

      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: fontSizes.sm,
          color: colors.textMuted,
          marginBottom: spacing.md,
        }}
      >
        {hasQuery ? `${results.length} records found` : `Showing ${results.length} of ${getAllMedicineReferences().length} records`}
      </Text>

      {hasNoResults ? (
        <EmptyState
          title="No medicines match"
          message="Try a different search term — generic name, brand, use, or FDA CPR number."
        />
      ) : (
        results.map((reference) => <DatabaseResultCard key={reference.id} reference={reference} />)
      )}
    </Screen>
  );
}
