import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBar } from '../../components/AppBar';
import { Screen } from '../../components/Screen';
import { RootStackParamList } from '../../navigation/types';
import { ChooseScanTypeContent } from './ChooseScanTypeContent';

export function ScanTabScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <AppBar title="Scan" subtitle="Identify medicines safely" />
      <ChooseScanTypeContent navigation={navigation} />
    </Screen>
  );
}
