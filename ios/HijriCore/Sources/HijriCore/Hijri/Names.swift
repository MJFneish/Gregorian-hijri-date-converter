import Foundation

/// The app's language — its own setting, independent of the phone's.
public enum Lang: String, CaseIterable, Sendable {
  case en, ar
}

public let hijriMonthsAr = [
  "محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة",
]

public let hijriMonthsEn = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Awwal", "Jumada al-Thani",
  "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
]

/// Levantine month names — what Lebanese calendars print (same set prayer-times-lb uses).
public let gregorianMonthsAr = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تمّوز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
]

public let gregorianMonthsEn = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

private let weekdaysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
private let weekdaysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

public func hijriMonthName(_ month: Int, _ lang: Lang) -> String {
  (lang == .ar ? hijriMonthsAr : hijriMonthsEn)[month - 1]
}

public func gregorianMonthName(_ month: Int, _ lang: Lang) -> String {
  (lang == .ar ? gregorianMonthsAr : gregorianMonthsEn)[month - 1]
}

/// 0 = Sunday.
public func weekdayName(_ weekday: Int, _ lang: Lang) -> String {
  (lang == .ar ? weekdaysAr : weekdaysEn)[weekday]
}
