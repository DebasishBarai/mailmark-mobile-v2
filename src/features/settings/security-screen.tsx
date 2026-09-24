import { useUser } from '@clerk/expo';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/feedback/toast';
import { Group, ListRow, Screen } from '@/components/ui';
import { WebLinks } from '@/lib/config';
import { shortDate } from '@/lib/format';

import { usePreferences } from './preferences';

export function SecurityScreen() {
  const toast = useToast();
  const { prefs, update } = usePreferences();
  const { user } = useUser();
  const [biometry, setBiometry] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (process.env.EXPO_OS === 'web') return;
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.getEnrolledLevelAsync();
      setAvailable(hasHardware || enrolled !== LocalAuthentication.SecurityLevel.NONE);
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBiometry(process.env.EXPO_OS === 'ios' ? 'Face ID' : 'Face unlock');
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBiometry(process.env.EXPO_OS === 'ios' ? 'Touch ID' : 'Fingerprint');
    })();
  }, []);

  const toggleLock = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on app lock' });
      if (!result.success) {
        toast.show({ message: 'App lock was not turned on.', tone: 'error' });
        return;
      }
    }
    update('appLock', value);
  };

  return (
    <Screen>
      <Group
        title="This device"
        footer={`Ask for ${biometry ?? 'your device passcode'} when you open Mailmark or return to it after 30 seconds away.`}>
        <ListRow
          title={`Lock with ${biometry ?? 'passcode'}`}
          icon="faceId"
          disabled={!available}
          toggle={{ value: prefs.appLock, onChange: toggleLock, disabled: !available }}
        />
        <ListRow
          title="Block remote images"
          subtitle="Stops senders seeing when you open their mail"
          icon="eye"
          toggle={{ value: prefs.blockRemoteImages, onChange: (v) => update('blockRemoteImages', v) }}
        />
      </Group>
      <Group title="Account" footer="Your password, two-step verification and active sessions are managed by your Mailmark account on the web.">
        <ListRow title="Signed in as" value={user?.primaryEmailAddress?.emailAddress} icon="user" />
        {user?.lastSignInAt ? <ListRow title="Last sign-in" value={shortDate(user.lastSignInAt.getTime())} icon="pending" /> : null}
        <ListRow title="Two-step verification" value={user?.twoFactorEnabled ? 'On' : 'Off'} icon="shield" />
        <ListRow title="Manage account security" icon="external" onPress={() => WebBrowser.openBrowserAsync(WebLinks.settings)} />
      </Group>
      <Group footer="Your session token is kept in the iOS Keychain / Android Keystore. API keys are never stored on this device.">
        <ListRow title="Privacy policy" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.privacy)} />
      </Group>
    </Screen>
  );
}
