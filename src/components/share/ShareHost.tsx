import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';

import { CaptureReadyContext, type CaptureTracker } from './CaptureReady';

type ViewRef = React.ComponentRef<typeof View>;
type Capture = (card: React.ReactElement) => Promise<string | null>;

const ShareImageContext = createContext<Capture | null>(null);

/** Longest a capture waits for its card to finish drawing before taking it anyway. */
const READY_TIMEOUT_MS = 2500;

interface Job {
  id: number;
  card: React.ReactElement;
  resolve: (uri: string | null) => void;
}

/**
 * Turns any card into a shareable image. Mount once near the app root; `useShareImage()` renders
 * the card here — parked far off-screen, laid out at full size — waits until it has really drawn
 * (every `useCaptureHold` released: moon photos loaded, gradients measured), then captures it with
 * react-native-view-shot, which draws the view itself rather than copying screen pixels.
 *
 * Off-screen, not inside a clipped 0×0 box: Yoga measured a card's content against that zero
 * height and the capture came out as a 360×48 dp strip (found on the emulator, v1.2.0).
 */
export function ShareHost({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<Job | null>(null);
  const jobRef = useRef<Job | null>(null);
  const nextId = useRef(1);

  const capture = useCallback<Capture>(
    card =>
      new Promise(resolve => {
        jobRef.current?.resolve(null); // a newer request replaces one still waiting
        const next = { id: nextId.current++, card, resolve };
        jobRef.current = next;
        setJob(next);
      }),
    [],
  );

  const done = useCallback((id: number) => {
    if (jobRef.current?.id !== id) return;
    jobRef.current = null;
    setJob(null);
  }, []);

  return (
    <ShareImageContext.Provider value={capture}>
      {children}
      {job && <CaptureStage key={job.id} job={job} onDone={done} />}
    </ShareImageContext.Provider>
  );
}

function CaptureStage({ job, onDone }: { job: Job; onDone: (id: number) => void }) {
  const ref = useRef<ViewRef>(null);
  // One stable object for the whole capture: a tracker that changed identity would make every
  // holder release and re-hold, and a release can trigger the capture early.
  const [api] = useState(() => {
    const state = { pending: 0, laidOut: false, finished: false };
    const finish = async () => {
      if (state.finished) return;
      state.finished = true;
      // Two frames, so what the last piece rendered reaches the native views before drawing.
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      let uri: string | null = null;
      try {
        uri = await captureRef(ref, { format: 'jpg', quality: 0.95, result: 'data-uri' });
      } catch {
        uri = null;
      }
      job.resolve(uri);
      onDone(job.id);
    };
    const check = () => {
      if (state.laidOut && state.pending === 0) finish();
    };
    const tracker: CaptureTracker = {
      hold: () => {
        state.pending += 1;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          state.pending -= 1;
          check();
        };
      },
    };
    const onLayout = () => {
      state.laidOut = true;
      check();
    };
    return { finish, tracker, onLayout };
  });

  useEffect(() => {
    const id = setTimeout(api.finish, READY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [api]);

  return (
    <View style={styles.stage} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <CaptureReadyContext.Provider value={api.tracker}>
        <View ref={ref} collapsable={false} onLayout={api.onLayout}>
          {job.card}
        </View>
      </CaptureReadyContext.Provider>
    </View>
  );
}

interface ShareRequest {
  /** The card to turn into the image (a ShareCard-like component, fixed width). */
  card: React.ReactElement;
  /** Caption sent with the image — and the whole share if the image can't be made. */
  message: string;
  /** File name without extension (Android). */
  filename: string;
}

/**
 * Shares a card as an image with a caption. The image goes as a JPEG data URI that
 * react-native-share writes to the app's *internal* cache (`useInternalStorage`): its FileProvider
 * covers that and it needs no storage permission. Falls back to the caption alone if the image
 * can't be made or sent. `busy` covers the capture only; the sheet's promise isn't awaited, so a
 * button never waits on what the receiving app (or a dismissed sheet) reports back.
 */
export function useShareImage() {
  const capture = useContext(ShareImageContext);
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const share = useCallback(
    async ({ card, message, filename }: ShareRequest) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      let image: string | null = null;
      try {
        image = capture ? await capture(card) : null;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      // failOnCancel: false — dismissing the sheet isn't an error (and mustn't trigger the fallback).
      const textOnly = { message, title: t('home.share'), failOnCancel: false };
      if (!image) {
        Share.open(textOnly).catch(() => {});
        return;
      }
      Share.open({ ...textOnly, url: image, type: 'image/jpeg', filename, useInternalStorage: true }).catch(() =>
        Share.open(textOnly).catch(() => {}),
      );
    },
    [capture, t],
  );

  return { share, busy };
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', top: 0, left: -10000 },
});
