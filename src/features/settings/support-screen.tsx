import { useUser } from '@clerk/expo';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, Group, ListRow, Screen } from '@/components/ui';
import { WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { haptic } from '@/lib/haptics';

/** Contact the team through the same support form the website uses. */
export function SupportScreen() {
  const toast = useToast();
  const { user } = useUser();
  const submit = useMutation(api.support.submit);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await submit({
        name: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Mailmark user',
        email: user?.primaryEmailAddress?.emailAddress ?? '',
        subject: subject.trim(),
        message: `${message.trim()}\n\n--\nSent from Mailmark ${Constants.expoConfig?.version ?? ''} on ${Platform.OS} ${Platform.Version}`,
      });
      haptic('success');
      setSent(true);
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Group title="Self-serve">
        <ListRow title="Getting started" icon="docs" onPress={() => WebBrowser.openBrowserAsync(`${WebLinks.docs}/getting-started`)} />
        <ListRow title="Domain setup" icon="domain" onPress={() => WebBrowser.openBrowserAsync(WebLinks.domainSetup)} />
        <ListRow title="Campaigns & follow-ups" icon="campaign" onPress={() => WebBrowser.openBrowserAsync(WebLinks.campaignsDocs)} />
        <ListRow title="Troubleshooting" icon="help" onPress={() => WebBrowser.openBrowserAsync(WebLinks.troubleshooting)} />
      </Group>
      {sent ? (
        <ThemedText type="body" themeColor="success">
          Thanks, your message is with the team. We reply by email to {user?.primaryEmailAddress?.emailAddress}.
        </ThemedText>
      ) : (
        <>
          <ThemedText type="label" themeColor="textSecondary">
            Message the team
          </ThemedText>
          <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What can we help with?" />
          <Field label="Message" value={message} onChangeText={setMessage} multiline placeholder="Include the domain or mailbox involved if you can." />
          <Button title="Send message" icon="send" loading={busy} disabled={!subject.trim() || !message.trim()} onPress={send} />
        </>
      )}
    </Screen>
  );
}
