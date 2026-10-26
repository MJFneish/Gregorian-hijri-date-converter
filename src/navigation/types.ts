export type RootStackParamList = {
  Main: undefined;
  /** `replay` = opened again from Settings: finishing goes back instead of resetting to Main. */
  Onboarding: { replay?: boolean } | undefined;
  // Pages opened from the Tools tab (screens/tools/).
  DaysBetween: undefined;
  /** `jdn` = the day to compare (from the converter's result); defaults to today. */
  CompareOffices: { jdn?: number } | undefined;
};
