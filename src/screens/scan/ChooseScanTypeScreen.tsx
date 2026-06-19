import React from 'react';
import { AppBar } from '../../components/AppBar';
import { Screen } from '../../components/Screen';
import { StackProps } from '../_shared/ScreenStub';
import { ChooseScanTypeContent } from './ChooseScanTypeContent';

export function ChooseScanTypeScreen({ navigation }: StackProps<'ChooseScanType'>) {
  return (
    <Screen>
      <AppBar
        title="Choose Scan Type"
        subtitle="Select how you want to identify this medicine"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ChooseScanTypeContent navigation={navigation} />
    </Screen>
  );
}
