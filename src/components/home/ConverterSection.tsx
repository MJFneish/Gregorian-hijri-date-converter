import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import Clipboard from '@react-native-clipboard/clipboard';
import { ArrowDown, ArrowLeftRight, CalendarCheck2, Copy, Info, Moon, Share2, Sun } from 'lucide-react-native';

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
import { useHomeScroll, type ViewRef } from './HomeScrollContext';
import { ResultSkeleton } from './ResultSkeleton';

type Direction = 'toHijri' | 'toGregorian';

interface Conversion {
  jdn: number;
  direction: Direction;
  /** Bumped on every Convert press so the result fades in even when the date didn't change. */
  run: number;
}

/** How long the result card shows its loading state. The lookup itself takes well under a
 * millisecond; this keeps the feedback readable instead of a one-frame flicker, and lets the
 * scroll to the result finish first. */
const MIN_CONVERTING_MS = 550;

/**
 * The converter. The wheels edit a *draft* (a JDN — one day on the shared timeline — plus the
 * direction); nothing is converted while they turn (user request: convert on demand, not on every
 * change). "Convert" scrolls Home to the result card, shows a loading state there, then applies
 * the draft. The result card always renders the last *applied* conversion and says so when the
 * wheels have moved since, so it never silently disagrees with them.
 *
 * Switching direction keeps the draft's day; changing method/adjustment in Settings re-labels the
 * applied result instantly (same day, new authority).
 */
export function ConverterSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const opts = useConversionOptions();
  const { scrollToView } = useHomeScroll();

  const [direction, setDirection] = useState<Direction>('toHijri');
  const [draftJdn, setDraftJdn] = useState(() => todayJdn());
  const [applied, setApplied] = useState<Conversion>(() => ({ jdn: todayJdn(), direction: 'toHijri', run: 0 }));
  const [converting, setConverting] = useState(false);
  const resultRef = useRef<ViewRef>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Draft (wheels)
  const inputIsHijri = direction === 'toGregorian';
  const inputValue: Ymd = inputIsHijri ? hijriOfJdn(draftJdn, opts) : jdnToGregorian(draftJdn);
  const onWheelsChange = (value: Ymd) => setDraftJdn(inputIsHijri ? jdnOfHijri(value, opts) : gregorianToJdn(value));
  const draftIsToday = draftJdn === todayJdn();
  const isStale = draftJdn !== applied.jdn || direction !== applied.direction;

  const convert = () => {
    if (converting) return;
    setConverting(true);
    scrollToView(resultRef.current);
    const next: Conversion = { jdn: draftJdn, direction, run: applied.run + 1 };
    timer.current = setTimeout(() => {
      setApplied(next);
      setConverting(false);
    }, MIN_CONVERTING_MS);
  };

  // Applied result — computed only when a conversion is applied (or the method changes).
  const info = useMemo(() => dayInfo(applied.jdn, opts), [applied.jdn, opts]);
  const outputIsGregorian = applied.direction === 'toGregorian';
  const weekday = weekdayName(info.weekday, lang);
  const hijriText = formatHijri(info.hijri, lang);
  const gregorianText = formatGregorian(info.gregorian, lang);
  const resultText = outputIsGregorian ? gregorianText : hijriText;
  const inputText = outputIsGregorian ? hijriText : gregorianText;
  const sentence = `${weekday}${lang === 'ar' ? '، ' : ', '}${inputText} = ${resultText}`;

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
        <View style={[styles.buttons, { flexDirection: rowDirection }]}>
          <PressableScale
            onPress={() => setDraftJdn(todayJdn())}
            disabled={draftIsToday}
            containerStyle={styles.todayBox}
            style={[styles.button, styles.todayButton, { borderColor: colors.border, flexDirection: rowDirection }]}
            accessibilityRole="button"
            accessibilityState={{ disabled: draftIsToday }}
          >
            <CalendarCheck2 size={18} color={colors.primary} />
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{t('home.goToToday')}</Text>
          </PressableScale>
          <PressableScale
            onPress={convert}
            disabled={converting}
            dimWhenDisabled={false}
            containerStyle={styles.convertBox}
            style={[styles.button, { backgroundColor: colors.primary, flexDirection: rowDirection }]}
            accessibilityRole="button"
            accessibilityState={{ disabled: converting, busy: converting }}
            accessibilityHint={t('home.convertHint')}
          >
            {converting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <ArrowLeftRight size={18} color={colors.onPrimary} />
            )}
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>
              {converting ? t('home.converting') : t('home.convertButton')}
            </Text>
          </PressableScale>
        </View>
      </Card>

      <View style={styles.arrow} importantForAccessibility="no" accessibilityElementsHidden>
        <View style={[styles.arrowBubble, { backgroundColor: colors.primary }]}>
          <ArrowDown size={18} color={colors.onPrimary} />
        </View>
      </View>

      {/* collapsable={false}: keep a real native view so measureLayout (scroll target) works. */}
      <View ref={resultRef} collapsable={false}>
        <Card>
          {converting ? (
            <ResultSkeleton />
          ) : (
            <Animated.View key={applied.run} entering={applied.run > 0 ? FadeIn.duration(280) : undefined}>
              {isStale && (
                <View style={[styles.stale, { backgroundColor: colors.accentSoft, flexDirection: rowDirection }]}>
                  <Info size={16} color={colors.accent} />
                  <Text style={[typography.caption, styles.staleText, { color: colors.accent, textAlign }]}>
                    {t('home.staleResult')}
                  </Text>
                </View>
              )}
              <Text style={[typography.label, { color: colors.textMuted, textAlign }]}>
                {outputIsGregorian ? t('home.resultGregorian') : t('home.resultHijri')}
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
                  style={[styles.button, { backgroundColor: colors.primarySoft, flexDirection: rowDirection }]}
                  accessibilityRole="button"
                >
                  <Copy size={18} color={colors.primary} />
                  <Text style={[typography.bodyStrong, { color: colors.primary }]}>{t('home.copy')}</Text>
                </PressableScale>
                <PressableScale
                  onPress={share}
                  containerStyle={styles.actionBox}
                  style={[styles.button, { backgroundColor: colors.primary, flexDirection: rowDirection }]}
                  accessibilityRole="button"
                >
                  <Share2 size={18} color={colors.onPrimary} />
                  <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{t('home.share')}</Text>
                </PressableScale>
              </View>
            </Animated.View>
          )}
        </Card>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: spacing.md, marginTop: spacing.md },
  todayBox: { flex: 1 },
  convertBox: { flex: 1.6 },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  todayButton: { borderWidth: 1 },
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
  stale: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  staleText: { flex: 1 },
  occasions: { marginTop: spacing.md, gap: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  actionBox: { flex: 1 },
});
