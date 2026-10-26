import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BUNDLED_TABLES, currentTables, setTableData } from '../../core/hijri';
import { useTableStore } from '../useTableStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const remote = (generated: string) => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', 'hijri-tables.json'), 'utf8'));
  raw.generated = generated;
  return JSON.stringify(raw);
};
const respond = (body: string, ok = true) => {
  (globalThis as any).fetch = jest.fn(() => Promise.resolve({ ok, status: ok ? 200 : 404, text: () => Promise.resolve(body) }));
};
const initial = useTableStore.getState();

beforeEach(async () => {
  await AsyncStorage.clear();
  setTableData(BUNDLED_TABLES);
  useTableStore.setState(initial, true);
});

describe('useTableStore', () => {
  it('applies and stores a newer download', async () => {
    respond(remote('2099-01-01T00:00:00Z'));
    await useTableStore.getState().check(true);
    const s = useTableStore.getState();
    expect(s.status).toBe('updated');
    expect(s.source).toBe('downloaded');
    expect(s.version).toBe(1);
    expect(currentTables().generated).toBe('2099-01-01T00:00:00Z');
    expect(await AsyncStorage.getItem('hijri-tables-remote')).toContain('2099-01-01T00:00:00Z');
    expect(s.lastCheck).not.toBeNull();
  });

  it('keeps the bundled tables when the download is not newer', async () => {
    respond(remote(BUNDLED_TABLES.generated));
    await useTableStore.getState().check(true);
    expect(useTableStore.getState().status).toBe('upToDate');
    expect(useTableStore.getState().version).toBe(0);
    expect(currentTables()).toBe(BUNDLED_TABLES);
  });

  it('rejects garbage and network errors without touching the tables', async () => {
    respond('{"format": 1}');
    await useTableStore.getState().check(true);
    expect(useTableStore.getState().status).toBe('failed');
    respond('not found', false);
    await useTableStore.getState().check(true);
    expect(useTableStore.getState().status).toBe('failed');
    expect(currentTables()).toBe(BUNDLED_TABLES);
  });

  it('checks at most once a day unless forced', async () => {
    respond(remote(BUNDLED_TABLES.generated));
    await useTableStore.getState().check(true);
    (globalThis as any).fetch.mockClear();
    await useTableStore.getState().check();
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  it('restores a stored download on startup, offline', async () => {
    await AsyncStorage.setItem('hijri-tables-remote', remote('2099-01-01T00:00:00Z'));
    await AsyncStorage.setItem('hijri-tables-last-check', String(Date.now()));
    respond('offline', false);
    await useTableStore.getState().init();
    expect(useTableStore.getState().source).toBe('downloaded');
    expect(currentTables().generated).toBe('2099-01-01T00:00:00Z');
    expect((globalThis as any).fetch).not.toHaveBeenCalled(); // checked less than a day ago
  });
});
