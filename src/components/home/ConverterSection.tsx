import React, { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import { ArrowDown, CalendarCheck2, Copy, Moon, Share2, Sun } from 'lucide-react-native';

import { gregorianToJdn, jdnToGregorian, todayJdn } from '../../core/calendar';
import { formatGregorian, formatHijri } from '../../core/format';
import { hijriOfJdn, jdnOfHijri, weekdayName } from '../../core/hijri';
import { dayInfo } from '../../core/today';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { OccasionBadge, SourceBadge } from '../badges';
import { DateWheels, type Ymd } from '../picker/DateWheels';
import { Card } from '../ui/Card';
import { PressableScale } from '../ui/PressableScale';
import { SectionLabel } from '../ui/SectionLabel';
import { SegmentedControl } from '../ui/SegmentedControl';
import { showToast } from '../Toast';

type Direction = 'toHijri' | 'toGregorian';

/**
 * The converter. Single source of truth is a JDN (one day on the shared timeline): the wheels show
 * that day in the *input* calendar, the result shows it in the other one. Switching direction
 * therefore keeps the same day, and changing method/adjustment in Settings re-labels it instantly.
 */
export function ConverterSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const opts = useConversionOptions();
  const [direction, setDirection] = useState<Direction>('toHijri');
  const [jdn, setJdn] = useState(() => todayJdn());

  const info = useMemo(() => dayInfo(jdn, opts), [jdn, opts]);
  const inputIsHijri = direction === 'toGregorian';
  const inputValue: Ymd = inputIsHijri ? hijriOfJdn(jdn, opts) : jdnToGregorian(jdn);

  const onWheelsChange = (value: Ymd) => setJdn(inputIsHijri ? jdnOfHijri(value, opts) : gregorianToJdn(value));

  const weekday = weekdayName(info.weekday, lang);
  const hijriText = formatHijri(info.hijri, lang);
  const gregorianText = formatGregorian(info.gregorian, lang);
  const resultText = inputIsHijri ? gregorianText : hijriText;
  const inputText = inputIsHijri ? hijriText : gregorianText;
  const sentence = `${weekday}${lang === 'ar' ? '، ' : ', '}${inputText} = ${resultText}`;
  const isToday = jdn === todayJdn();

  const copy = () => {
    Clipboard.setString(sentence);
    showToast(t('home.copied'));
  };
  const share = () => {
    Share.share({ message: `${sentence}\n${t('home.shareFooter', { method: t(`methods.${opts.method}.name`) })}` }).catch(
      () => {},
    );
  };

  return (
    <>
      <SectionLabel>{t('home.convert')}</SectionLabel>
      <Card>
        <SegmentedControl<Direction>
          value={direction}
          onChange={setDirection}
          accessibilityLabel={t('home.direction')}
          options={[
            { value: 'toHijri', label: t('home.toHijri'), Icon: Moon },
            { value: 'toGregorian', label: t('home.toGregorian'), Icon: Sun },
          ]}
        />
        <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginTop: spacing.md, marginBottom: spacing.sm }]}>
          {inputIsHijri ? t('home.pickHijri') : t('home.pickGregorian')}
        </Text>
        <DateWheels
          calendar={inputIsHijri ? 'hijri' : 'gregorian'}
          value={inputValue}
          onChange={onWheelsChange}
          method={opts.method}
          fadeColor={colors.card}
        />
        <PressableScale
          onPress={() => setJdn(todayJdn())}
          disabled={isToday}
          containerStyle={styles.todayButtonBox}
          style={[styles.todayButton, { borderColor: colors.border, flexDirection: rowDirection }]}
          accessibilityRole="button"
          accessibilityState={{ disabled: isToday }}
        >
          <CalendarCheck2 size={18} color={colors.primary} />
          <Text style={[typography.bodyStrong, { color: colors.primary }]}>{t('home.goToToday')}</Text>
        </PressableScale>
      </Card>

      <View style={styles.arrow} importantForAccessibility="no" accessibilityElementsHidden>
        <View style={[styles.arrowBubble, { backgroundColor: colors.primary }]}>
          <ArrowDown size={18} color={colors.onPrimary} />
        </View>
      </View>

      <Card>
        <Text style={[typography.label, { color: colors.textMuted, textAlign }]}>
          {inputIsHijri ? t('home.resultGregorian') : t('home.resultHijri')}
        </Text>
        <Text
          style={[typography.displayMedium, { color: colors.text, textAlign, marginTop: spacing.xs }]}
          accessibilityLiveRegion="polite"
          selectable
        >
          {resultText}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, textAlign, marginBottom: spacing.md }]}>
          {weekday} · {inputText}
        </Text>
        <SourceBadge source={info.source} />
        {info.occasions.length > 0 && (
          <View style={styles.occasions}>
            {info.occasions.map(o => (
              <OccasionBadge key={o.nameEn} occasion={o} />
            ))}
          </View>
        )}
        <View style={[styles.actions, { flexDirection: rowDirection }]}>
          <PressableScale
            onPress={copy}
            containerStyle={styles.actionBox}
            style={[styles.action, { backgroundColor: colors.primarySoft, flexDirection: rowDirection }]}
            accessibilityRole="button"
          >
            <Copy size={18} color={colors.primary} />
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{t('home.copy')}</Text>
          </PressableScale>
          <PressableScale
            onPress={share}
            containerStyle={styles.actionBox}
            style={[styles.action, { backgroundColor: colors.primary, flexDirection: rowDirection }]}
            accessibilityRole="button"
          >
            <Share2 size={18} color={colors.onPrimary} />
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{t('home.share')}</Text>
          </PressableScale>
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  todayButtonBox: { marginTop: spacing.md },
  todayButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  arrow: { alignItems: 'center', marginVertical: -spacing.md, zIndex: 2 },
  arrowBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // Android draws by elevation before zIndex — must out-rank the cards' elevation to overlap them.
    elevation: 8,
  },
  occasions: { marginTop: spacing.md, gap: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  actionBox: { flex: 1 },
  action: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
