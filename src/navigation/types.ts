export type RootStackParamList = {
  Main: undefined;
  /** `replay` = opened again from Settings: finishing goes back instead of resetting to Main. */
  Onboarding: { replay?: boolean } | undefined;
};
