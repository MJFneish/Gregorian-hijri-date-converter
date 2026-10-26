import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BUNDLED_TABLES, currentTables, setTableData, validateTableData } from '../core/hijri';

/**
 * Month-start updates without a new APK (user request, 2026-10-26). The build script also writes
 * the tables to data/hijri-tables.json; once that's pushed to GitHub, installed apps download it
 * (at most once a day, or from Settings → Calendar data), validate it hard (validateTableData),
 * and switch to it if it's newer than what they use. The download is kept for offline starts.
 */
export const TABLES_URL =
  'https://raw.githubusercontent.com/MJFneish/Gregorian-hijri-date-converter/develop/data/hijri-tables.json';

const STORED_KEY = 'hijri-tables-remote';
const LAST_CHECK_KEY = 'hijri-tables-last-check';
const CHECK_EVERY_MS = 24 * 3600e3;
const TIMEOUT_MS = 10_000;

export type CheckStatus = 'idle' | 'checking' | 'updated' | 'upToDate' | 'failed';

interface TableState {
  /** Bumped whenever the tables in use change — part of useConversionOptions, so memoized
   * conversions recompute. */
  version: number;
  source: 'bundled' | 'downloaded';
  /** `generated` timestamp of the tables in use. */
  generated: string;
  /** Last time the repo answered (ms), or null. */
  lastCheck: number | null;
  status: CheckStatus;
  /** Once at startup: restore a stored download, then check if a day has passed. */
  init: () => Promise<void>;
  /** Download and apply if newer. `force` ignores the once-a-day limit (the Settings button). */
  check: (force?: boolean) => Promise<void>;
}

export const useTableStore = create<TableState>()((set, get) => ({
  version: 0,
  source: 'bundled',
  generated: BUNDLED_TABLES.generated,
  lastCheck: null,
  status: 'idle',

  init: async () => {
    try {
      const [stored, lastCheck] = await Promise.all([AsyncStorage.getItem(STORED_KEY), AsyncStorage.getItem(LAST_CHECK_KEY)]);
      const data = stored ? validateTableData(JSON.parse(stored)) : null;
      if (data && data.generated > currentTables().generated) {
        setTableData(data);
        set(s => ({ version: s.version + 1, source: 'downloaded', generated: data.generated }));
      }
      set({ lastCheck: lastCheck ? Number(lastCheck) : null });
    } catch {
      // Unreadable storage: keep the bundled tables.
    }
    const { lastCheck } = get();
    if (lastCheck === null || Date.now() - lastCheck > CHECK_EVERY_MS) await get().check();
  },

  check: async (force = false) => {
    const { status, lastCheck } = get();
    if (status === 'checking') return;
    if (!force && lastCheck !== null && Date.now() - lastCheck < CHECK_EVERY_MS) return;
    set({ status: 'checking' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(TABLES_URL, { headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const data = validateTableData(JSON.parse(text));
      const now = Date.now();
      await AsyncStorage.setItem(LAST_CHECK_KEY, String(now));
      if (!data) {
        set({ status: 'failed', lastCheck: now });
        return;
      }
      if (data.generated > currentTables().generated) {
        await AsyncStorage.setItem(STORED_KEY, text);
        setTableData(data);
        set(s => ({ version: s.version + 1, source: 'downloaded', generated: data.generated, status: 'updated', lastCheck: now }));
      } else {
        set({ status: 'upToDate', lastCheck: now });
      }
    } catch {
      set({ status: 'failed' });
    } finally {
      clearTimeout(timer);
    }
  },
}));
