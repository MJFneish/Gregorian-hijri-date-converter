import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Cake, Info, Lock } from 'lucide-react-native';

import { DatePickerSheet } from '../../components/picker/DatePickerSheet';
import type { CalendarKind, Ymd } from '../../components/picker/DateWheels';
import { DateField } from '../../components/tools/DateField';
import { Card } from '../../components/ui/Card';
import { PageScreen } from '../../components/ui/PageScreen';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { hijriBirthday } from '../../core/birthday';
import { gregorianToJdn, jdnToGregorian, todayJdn, weekdayOfJdn } from '../../core/calendar';
import { formatGregorian, formatHijri, localizeDigits } from '../../core/format';
import { hijriMonthName, hijriOfJdn, jdnOfHijri, weekdayName } from '../../core/hijri';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { countPhrase, spanPhrase } from '../../i18n/plural';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

/** Where the picker opens when no birth date is saved yet. */
const DEFAULT_AGE_DAYS = 30 * 365;

/**
 * Tools → Hijri birthday: the birth date in the Hijri calendar, the next Hijri birthday (with a
 * countdown and its Gregorian date — it moves ~11 days earlier every Gregorian year) and the age
 * in Hijri vs Gregorian years. The birth date can be entered in either calendar and is kept on
 * the phone only (settings store).
 */
export default function BirthdayScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const opts = useConversionOptions();
  const birthJdn = useSettingsStore(s => s.birthJdn);
  const setBirthJdn = useSettingsStore(s => s.setBirthJdn);
  const [calendar, setCalendar] = useState<CalendarKind>('gregorian');
  const [picking, setPicking] = useState(false);

  const today = todayJdn();
  const valid = birthJdn !== null && birthJdn <= today;
  const info = useMemo(
    () => (birthJdn !== null && birthJdn <= today ? hijriBirthday(birthJdn, today, opts) : null),
    [birthJdn, today, opts],
  );

  const pickerJdn = birthJdn ?? today - DEFAULT_AGE_DAYS;
  const toYmd = (jdn: number): Ymd => (calendar === 'hijri' ? hijriOfJdn(jdn, opts) : jdnToGregorian(jdn));
  const fromYmd = (value: Ymd) => (calendar === 'hijri' ? jdnOfHijri(value, opts) : gregorianToJdn(value));
  const fieldValue =
    birthJdn === null
      ? t('birthday.notSet')
      : calendar === 'hijri'
        ? formatHijri(hijriOfJdn(birthJdn, opts), lang)
        : formatGregorian(jdnToGregorian(birthJdn), lang);

  const dateLine = (jdn: number) => `${weekdayName(weekdayOfJdn(jdn), lang)} ${formatGregorian(jdnToGregorian(jdn), lang)}`;

  return (
    <PageScreen title={t('tools.birthday.title')} subtitle={t('tools.birthday.description')}>
      <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginBottom: spacing.sm }]}>
        {t('birthday.enterIn')}
      </Text>
      <SegmentedControl<CalendarKind>
        value={calendar}
        onChange={setCalendar}
        accessibilityLabel={t('birthday.enterIn')}
        options={[
          { value: 'gregorian', label: t('common.gregorian') },
          { value: 'hijri', label: t('common.hijri') },
        ]}
      />
      <View style={styles.field}>
        <DateField label={t('birthday.birthDate')} value={fieldValue} onPress={() => setPicking(true)} />
      </View>
      <View style={[styles.note, { flexDirection: rowDirection }]}>
        <Lock size={14} color={colors.textMuted} />
        <Text style={[typography.caption, styles.flex, { color: colors.textMuted, textAlign }]}>{t('birthday.private')}</Text>
      </View>

      {birthJdn !== null && !valid && (
        <Text style={[typography.body, { color: colors.mourning, textAlign, marginTop: spacing.lg }]}>{t('birthday.future')}</Text>
      )}

      {info && birthJdn !== null && (
        <>
          <SectionLabel>{t('birthday.nextTitle')}</SectionLabel>
          <Card>
            <View style={[styles.nextHead, { flexDirection: rowDirection }]}>
              <View style={[styles.cake, { backgroundColor: colors.accentSoft }]}>
                <Cake size={26} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={[typography.displayMedium, { color: colors.primary, textAlign }]}>
                  {info.next.inDays === 0
                    ? t('birthday.today')
                    : info.next.inDays === 1
                      ? t('birthday.tomorrow')
                      : t('birthday.inDays', { days: countPhrase('day', info.next.inDays, lang, true) })}
                </Text>
                <Text style={[typography.body, { color: colors.text, textAlign }]}>
                  {t('birthday.turning', { age: localizeDigits(info.next.turning, lang) })}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[typography.title, { color: colors.text, textAlign }]}>{formatHijri(info.next.hijri, lang)}</Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign }]}>{dateLine(info.next.jdn)}</Text>
            {info.next.clamped && (
              <View style={[styles.note, { flexDirection: rowDirection }]}>
                <Info size={14} color={colors.textMuted} />
                <Text style={[typography.caption, styles.flex, { color: colors.textMuted, textAlign }]}>
                  {t('birthday.clamped', { month: hijriMonthName(info.next.hijri.month, lang) })}
                </Text>
              </View>
            )}
          </Card>

          <SectionLabel>{t('birthday.bornTitle')}</SectionLabel>
          <Card>
            <Text style={[typography.title, { color: colors.text, textAlign }]}>{formatHijri(info.birthHijri, lang)}</Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign }]}>{dateLine(birthJdn)}</Text>
          </Card>

          <SectionLabel>{t('birthday.ageTitle')}</SectionLabel>
          <Card>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{t('birthday.hijriAge')}</Text>
            <Text style={[typography.subtitle, { color: colors.text, textAlign, marginBottom: spacing.md }]}>
              {spanPhrase(info.hijriAge, lang)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{t('birthday.gregorianAge')}</Text>
            <Text style={[typography.subtitle, { color: colors.text, textAlign }]}>{spanPhrase(info.gregorianAge, lang)}</Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginTop: spacing.md }]}>
              {t('birthday.why')}
            </Text>
          </Card>

          <Pressable
            onPress={() => setBirthJdn(null)}
            style={styles.forget}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={[typography.bodyStrong, styles.center, { color: colors.mourning }]}>{t('birthday.forget')}</Text>
          </Pressable>
        </>
      )}

      <DatePickerSheet
        visible={picking}
        title={t('birthday.birthDate')}
        calendar={calendar}
        initial={toYmd(pickerJdn)}
        method={opts.method}
        onConfirm={value => setBirthJdn(fromYmd(value))}
        onClose={() => setPicking(false)}
      />
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  field: { marginTop: spacing.md },
  note: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  nextHead: { alignItems: 'center', gap: spacing.md },
  cake: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  forget: { minHeight: 48, justifyContent: 'center', marginTop: spacing.lg },
});
