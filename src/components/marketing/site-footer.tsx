import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Divider } from '@/components/ui';
import { FOOTER_LINKS, FOOTER_TAGLINE, SITE_URL } from '@/constants/content';
import { Spacing } from '@/constants/theme';

export function SiteFooter() {
  return (
    <View style={styles.footer}>
      <Divider style={styles.divider} />
      <Logo size={26} />
      <ThemedText type="small" themeColor="textSecondary">
        {FOOTER_TAGLINE}
      </ThemedText>

      <View style={styles.columns}>
        {FOOTER_LINKS.map((group) => (
          <View key={group.heading} style={styles.column}>
            <ThemedText type="label" themeColor="textMuted">
              {group.heading}
            </ThemedText>
            {group.links.map((link) => (
              <ExternalLink key={link.path} href={`${SITE_URL}${link.path}`}>
                <ThemedText type="small" themeColor="textSecondary">
                  {link.label}
                </ThemedText>
              </ExternalLink>
            ))}
          </View>
        ))}
      </View>

      <ThemedText type="caption" themeColor="textMuted">
        © {new Date().getFullYear()} Mailmark. All rights reserved.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.three,
    paddingTop: Spacing.seven,
  },
  divider: {
    marginBottom: Spacing.four,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.five,
    paddingVertical: Spacing.three,
  },
  column: {
    minWidth: 130,
    gap: Spacing.two,
  },
});
