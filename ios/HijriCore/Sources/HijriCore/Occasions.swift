import Foundation

public enum OccasionKind: String, Sendable {
  case mourning, celebration, other
}

public struct Occasion: Hashable, Sendable {
  public let month: Int
  /// Ignored when `lastDayOfMonth` is set.
  public let day: Int
  public let kind: OccasionKind
  public let nameEn: String
  public let nameAr: String
  /// Observed on the month's last day, whether that's the 29th or the 30th.
  public let lastDayOfMonth: Bool

  init(month: Int, day: Int, kind: OccasionKind, nameEn: String, nameAr: String, lastDayOfMonth: Bool = false) {
    self.month = month
    self.day = day
    self.kind = kind
    self.nameEn = nameEn
    self.nameAr = nameAr
    self.lastDayOfMonth = lastDayOfMonth
  }

  public func name(_ lang: Lang) -> String { lang == .ar ? nameAr : nameEn }
}

/// Twelver Shia occasions, as observed in Lebanon / Iran's official calendar. Researched against
/// Iran's official holiday list, Sistani's office (I.M.A.M.) monthly lists, Fadlallah's office and
/// WikiShia — see CLAUDE.md "Occasions". Where narrations differ, the date Iran's calendar (and
/// Lebanese Hezbollah-affiliated calendars) use is the one listed; the alternative is noted inline.
/// One entry per (month, day): occasions that coincide are merged. Same list as the Android app's.
public let occasions: [Occasion] = [
  Occasion(month: 1, day: 1, kind: .other, nameEn: "Islamic New Year", nameAr: "رأس السنة الهجرية"),
  Occasion(month: 1, day: 9, kind: .mourning, nameEn: "Tasu'a (9th of Muharram)", nameAr: "تاسوعاء"),
  Occasion(month: 1, day: 10, kind: .mourning, nameEn: "Ashura — Martyrdom of Imam Husayn (AS)", nameAr: "عاشوراء — استشهاد الإمام الحسين (ع)"),
  // Alternative narration: 12 Muharram.
  Occasion(month: 1, day: 25, kind: .mourning, nameEn: "Martyrdom of Imam Ali Zayn al-Abidin (AS)", nameAr: "استشهاد الإمام علي زين العابدين (ع)"),
  // Arab/Sistani-office date; Iran's calendar marks it on 20 Dhu al-Hijjah.
  Occasion(month: 2, day: 7, kind: .celebration, nameEn: "Birth of Imam Musa al-Kazim (AS)", nameAr: "ولادة الإمام موسى الكاظم (ع)"),
  Occasion(month: 2, day: 20, kind: .mourning, nameEn: "Arbaeen of Imam Husayn (AS)", nameAr: "أربعين الإمام الحسين (ع)"),
  // Iran/Lebanon date for Imam Hasan; Iraqi/Sistani-office calendars use 7 Safar.
  Occasion(month: 2, day: 28, kind: .mourning, nameEn: "Demise of the Prophet (SAWA) & Martyrdom of Imam Hasan (AS)", nameAr: "وفاة الرسول الأكرم (ص) واستشهاد الإمام الحسن المجتبى (ع)"),
  // Iraqi/Sistani-office calendars use 17 Safar.
  Occasion(month: 2, day: 30, kind: .mourning, nameEn: "Martyrdom of Imam Ali al-Rida (AS)", nameAr: "استشهاد الإمام علي بن موسى الرضا (ع)", lastDayOfMonth: true),
  Occasion(month: 3, day: 8, kind: .mourning, nameEn: "Martyrdom of Imam Hasan al-Askari (AS)", nameAr: "استشهاد الإمام الحسن العسكري (ع)"),
  Occasion(month: 3, day: 9, kind: .celebration, nameEn: "Beginning of the Imamate of Imam al-Mahdi (AJ)", nameAr: "بداية إمامة الإمام المهدي (عج)"),
  // Sunni Mawlid date is 12 Rabi' al-Awwal; 12–17 is Islamic Unity Week.
  Occasion(month: 3, day: 17, kind: .celebration, nameEn: "Birth of the Prophet Muhammad (SAWA) & Imam al-Sadiq (AS)", nameAr: "ولادة الرسول الأكرم (ص) والإمام جعفر الصادق (ع)"),
  Occasion(month: 4, day: 8, kind: .celebration, nameEn: "Birth of Imam Hasan al-Askari (AS)", nameAr: "ولادة الإمام الحسن العسكري (ع)"),
  Occasion(month: 4, day: 10, kind: .mourning, nameEn: "Demise of Sayyida Fatima al-Ma'suma (AS)", nameAr: "وفاة السيدة فاطمة المعصومة (ع)"),
  Occasion(month: 5, day: 5, kind: .celebration, nameEn: "Birth of Sayyida Zaynab (AS)", nameAr: "ولادة السيدة زينب الكبرى (ع)"),
  // 75-day narration (first Fatimiyya), mourned in addition to 3 Jumada al-Thani.
  Occasion(month: 5, day: 13, kind: .mourning, nameEn: "Martyrdom of Sayyida Fatima al-Zahra (AS) — First Fatimiyya", nameAr: "استشهاد السيدة فاطمة الزهراء (ع) — الفاطمية الأولى"),
  // 95-day narration (second Fatimiyya) — Iran's official date.
  Occasion(month: 6, day: 3, kind: .mourning, nameEn: "Martyrdom of Sayyida Fatima al-Zahra (AS)", nameAr: "استشهاد السيدة فاطمة الزهراء (ع)"),
  Occasion(month: 6, day: 20, kind: .celebration, nameEn: "Birth of Sayyida Fatima al-Zahra (AS)", nameAr: "ولادة السيدة فاطمة الزهراء (ع)"),
  // Alternative narration: 3 Safar.
  Occasion(month: 7, day: 1, kind: .celebration, nameEn: "Birth of Imam Muhammad al-Baqir (AS)", nameAr: "ولادة الإمام محمد الباقر (ع)"),
  // Alternative narration: 26 Jumada al-Thani.
  Occasion(month: 7, day: 3, kind: .mourning, nameEn: "Martyrdom of Imam Ali al-Hadi (AS)", nameAr: "استشهاد الإمام علي الهادي (ع)"),
  Occasion(month: 7, day: 10, kind: .celebration, nameEn: "Birth of Imam Muhammad al-Jawad (AS)", nameAr: "ولادة الإمام محمد الجواد (ع)"),
  Occasion(month: 7, day: 13, kind: .celebration, nameEn: "Birth of Imam Ali ibn Abi Talib (AS)", nameAr: "ولادة أمير المؤمنين الإمام علي (ع)"),
  Occasion(month: 7, day: 15, kind: .mourning, nameEn: "Demise of Sayyida Zaynab (AS)", nameAr: "وفاة السيدة زينب الكبرى (ع)"),
  Occasion(month: 7, day: 25, kind: .mourning, nameEn: "Martyrdom of Imam Musa al-Kazim (AS)", nameAr: "استشهاد الإمام موسى الكاظم (ع)"),
  Occasion(month: 7, day: 27, kind: .celebration, nameEn: "Mab'ath — Beginning of the Prophet's (SAWA) Mission", nameAr: "المبعث النبوي الشريف"),
  Occasion(month: 8, day: 3, kind: .celebration, nameEn: "Birth of Imam Husayn (AS)", nameAr: "ولادة الإمام الحسين (ع)"),
  Occasion(month: 8, day: 4, kind: .celebration, nameEn: "Birth of al-Abbas ibn Ali (AS)", nameAr: "ولادة أبي الفضل العباس (ع)"),
  // Alternative narration: 15 Jumada al-Awwal.
  Occasion(month: 8, day: 5, kind: .celebration, nameEn: "Birth of Imam Ali Zayn al-Abidin (AS)", nameAr: "ولادة الإمام علي زين العابدين (ع)"),
  Occasion(month: 8, day: 15, kind: .celebration, nameEn: "Birth of Imam al-Mahdi (AJ)", nameAr: "ولادة الإمام المهدي المنتظر (عج)"),
  Occasion(month: 9, day: 1, kind: .other, nameEn: "First day of Ramadan", nameAr: "أول أيام شهر رمضان المبارك"),
  Occasion(month: 9, day: 15, kind: .celebration, nameEn: "Birth of Imam Hasan al-Mujtaba (AS)", nameAr: "ولادة الإمام الحسن المجتبى (ع)"),
  // The Qadr nights are the eves of the 19th, 21st and 23rd (from Maghrib of the previous day).
  Occasion(month: 9, day: 19, kind: .mourning, nameEn: "Laylat al-Qadr — Wounding of Imam Ali (AS)", nameAr: "ليلة القدر — جرح أمير المؤمنين الإمام علي (ع)"),
  Occasion(month: 9, day: 21, kind: .mourning, nameEn: "Laylat al-Qadr — Martyrdom of Imam Ali (AS)", nameAr: "ليلة القدر — استشهاد أمير المؤمنين الإمام علي (ع)"),
  Occasion(month: 9, day: 23, kind: .other, nameEn: "Laylat al-Qadr", nameAr: "ليلة القدر"),
  Occasion(month: 10, day: 1, kind: .celebration, nameEn: "Eid al-Fitr", nameAr: "عيد الفطر السعيد"),
  // Alternative narration: 15 Rajab.
  Occasion(month: 10, day: 25, kind: .mourning, nameEn: "Martyrdom of Imam Ja'far al-Sadiq (AS)", nameAr: "استشهاد الإمام جعفر الصادق (ع)"),
  Occasion(month: 11, day: 1, kind: .celebration, nameEn: "Birth of Sayyida Fatima al-Ma'suma (AS)", nameAr: "ولادة السيدة فاطمة المعصومة (ع)"),
  Occasion(month: 11, day: 11, kind: .celebration, nameEn: "Birth of Imam Ali al-Rida (AS)", nameAr: "ولادة الإمام علي بن موسى الرضا (ع)"),
  Occasion(month: 11, day: 30, kind: .mourning, nameEn: "Martyrdom of Imam Muhammad al-Jawad (AS)", nameAr: "استشهاد الإمام محمد الجواد (ع)", lastDayOfMonth: true),
  Occasion(month: 12, day: 7, kind: .mourning, nameEn: "Martyrdom of Imam Muhammad al-Baqir (AS)", nameAr: "استشهاد الإمام محمد الباقر (ع)"),
  Occasion(month: 12, day: 9, kind: .other, nameEn: "Day of Arafah", nameAr: "يوم عرفة"),
  Occasion(month: 12, day: 10, kind: .celebration, nameEn: "Eid al-Adha", nameAr: "عيد الأضحى المبارك"),
  // Alternative narration: 2 Rajab.
  Occasion(month: 12, day: 15, kind: .celebration, nameEn: "Birth of Imam Ali al-Hadi (AS)", nameAr: "ولادة الإمام علي الهادي (ع)"),
  Occasion(month: 12, day: 18, kind: .celebration, nameEn: "Eid al-Ghadir", nameAr: "عيد الغدير الأغر"),
  Occasion(month: 12, day: 24, kind: .celebration, nameEn: "Day of Mubahala", nameAr: "يوم المباهلة"),
]

/// Occasions falling on a Hijri date. `monthLength` (29/30) resolves the last-day-of-month ones.
public func occasionsOn(_ date: HijriDate, _ monthLength: Int) -> [Occasion] {
  occasions.filter { o in
    o.month == date.month && (o.lastDayOfMonth ? date.day == monthLength : o.day == date.day)
  }
}
