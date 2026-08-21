import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CostCalculator } from '@/components/marketing/cost-calculator';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Faq } from '@/components/marketing/faq';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Pricing } from '@/components/marketing/pricing';
import { SdkBlock } from '@/components/marketing/sdk-block';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Testimonials } from '@/components/marketing/testimonials';
import { TopBar } from '@/components/marketing/top-bar';
import { ThemedText } from '@/components/themed-text';
import { Card, Icon, Screen, Section, type IconName } from '@/components/ui';
import { DOCS_URL, HOW_IT_WORKS } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ONE_TOOL: { title: string; body: string; icon: IconName }[] = [
  { title: 'Multiple Domains', body: "Add every product's domain with guided DNS setup and auto-verification.", icon: 'domain' },
  { title: 'Unlimited Mailboxes', body: 'Create hello@, support@, team@ and as many addresses as your products need.', icon: 'inbox' },
  { title: 'Reply Management', body: 'Inbox, Sent, Outbox, Drafts, Trash. Handle every product’s replies in a complete email client.', icon: 'reply' },
  { title: 'User Campaigns', body: 'Announce launches and updates with mail merge, so every email feels one-to-one.', icon: 'campaign' },
  { title: 'Auto Follow-Ups', body: 'Multi-stage sequences that send automatically based on recipient behavior.', icon: 'bolt' },
  { title: 'Analytics', body: 'Real-time tracking for opens, clicks, replies, and bounces per campaign.', icon: 'analytics' },
  { title: 'Deliverability', body: 'SPF, DKIM, DMARC configured automatically so your campaigns reach the inbox.', icon: 'shield' },
  { title: 'API & SDK', body: 'Send from your own code with a REST API and the mailmark-sdk npm package.', icon: 'api' },
];

export default function LandingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const howItWorksY = useRef(0);

  const goToSignIn = () => router.push('/sign-in');

  return (
    <View style={styles.root}>
      <TopBar onSignIn={goToSignIn} />

      <Screen ref={scrollRef}>
        <Hero
          onSecondary={goToSignIn}
          onPrimary={() =>
            scrollRef.current?.scrollTo({ y: howItWorksY.current, animated: true })
          }
        />

        <Section index="02" eyebrow="The arithmetic" title="The cost isn’t the subscription. It’s the multiplication.">
          <CostCalculator />
        </Section>

        <View onLayout={(event) => (howItWorksY.current = event.nativeEvent.layout.y)}>
          <Section
            index="03"
            eyebrow="How it works"
            title="From a bare domain to talking to users"
            subtitle={`From your first product domain to talking to your users, in ${HOW_IT_WORKS.length} simple steps.`}>
            <HowItWorks />
          </Section>
        </View>

        <Section
          index="04"
          eyebrow="For your code"
          title="Send email straight from your apps"
          subtitle="One API key per domain, scoped to that product. Transactional and campaign sends hit the same endpoint, from the same reputation you’ve been warming.">
          <SdkBlock onOpenDocs={() => openBrowserAsync(DOCS_URL)} />
        </Section>

        <Section
          index="05"
          eyebrow="Make it yours"
          title="Personalize every surface"
          subtitle="Choose from 11 themes, set background wallpapers, adjust UI density, and craft professional email signatures, all synced across devices.">
          <Card style={styles.themePreview}>
            <Icon name="palette" size={20} color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              This app follows your system appearance and ships with Mailmark’s Clean White and
              Enterprise Dark palettes. The rest of the theme library lives in Settings on the web.
            </ThemedText>
          </Card>
        </Section>

        <Section
          index="06"
          eyebrow="What you get"
          title="Everything your products need to talk to users"
          subtitle="Domains, mailboxes, campaigns, an API, and deliverability, for one product or ten, all in a single platform.">
          <FeatureGrid />
        </Section>

        <Section
          index="07"
          eyebrow="One tool, not five"
          title="One tool instead of five"
          subtitle="Domains, inboxes, campaigns, an API, and deliverability. Stop paying for and wiring up a separate service for each.">
          <View style={styles.compactGrid}>
            {ONE_TOOL.map((item) => (
              <Card key={item.title} tone="flat" style={styles.compactCard}>
                <Icon name={item.icon} size={16} color={theme.accent} />
                <ThemedText type="smallStrong">{item.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {item.body}
                </ThemedText>
              </Card>
            ))}
          </View>
        </Section>

        <Section
          index="08"
          eyebrow="What people say"
          title="Loved by businesses everywhere"
          subtitle="See why teams choose Mailmark for their email campaigns.">
          <Testimonials />
        </Section>

        <Section index="09" eyebrow="Pricing" title="Priced by how much you ship">
          <Pricing onChoose={goToSignIn} />
        </Section>

        <Section
          index="10"
          eyebrow="Questions"
          title="Frequently asked questions"
          subtitle="Everything you need to know about Mailmark.">
          <Faq />
        </Section>

        <CtaBlock onPress={goToSignIn} />
        <SiteFooter />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  themePreview: {
    gap: Spacing.two,
  },
  compactGrid: {
    gap: Spacing.two,
  },
  compactCard: {
    gap: Spacing.one,
  },
});
