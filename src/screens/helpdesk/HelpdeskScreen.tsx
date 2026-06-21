import React from 'react';
import { AppBar } from '../../components/AppBar';
import { ChatPanel } from '../../components/chat';
import { Screen } from '../../components/Screen';
import { StackProps } from '../_shared/ScreenStub';

export function HelpdeskScreen({ navigation }: StackProps<'Helpdesk'>) {
  return (
    <Screen scroll={false} padded={false}>
      <AppBar title="MediScan Chat" showBack onBack={() => navigation.goBack()} />
      <ChatPanel variant="full" />
    </Screen>
  );
}
