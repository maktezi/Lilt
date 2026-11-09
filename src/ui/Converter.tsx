import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import LottieView from 'lottie-react-native';
import { converterBridge, converterDownload, converterOrigin, converterPage, qualityForProvider, type ConverterProps } from '../core/converter';
import { watchConversion } from '../core/conversion-watchdog';
import { downloadPercent, type DownloadPhase } from '../core/download-status';
import { formatBytes } from '../core/model';
import { Button, Icon, IconButton } from './components';
import { useTheme } from './theme';

type Phase = DownloadPhase;
const titles: Record<Phase, string> = { connecting: 'Connecting to your song', verifying: 'Checking the audio source', preparing: 'Preparing your song', extracting: 'Preparing your audio', converting: 'Getting your audio ready', downloading: 'Downloading your song', saving: 'Saving to your collection', complete: 'Ready when you are' };

export function Converter({ visible, playlistId, onMinimize, onUpdate, videoLink, quality, provider: initial, onClose, onDone, onDownload }: ConverterProps) {
  const { colors: c, common: s } = useTheme();
  const [provider, setProvider] = useState(initial), [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(''), [phase, setPhase] = useState<Phase>('connecting');
  const [bytes, setBytes] = useState({ received: 0, total: 0 }), [reduceMotion, setReduceMotion] = useState(true);
  const [preparationPercent, setPreparationPercent] = useState<number | null>(null);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [songTitle, setSongTitle] = useState('YouTube audio');
  const [jobId, setJobId] = useState<string | undefined>();
  const accepted = useRef(false), mounted = useRef(true), animation = useRef<LottieView>(null);
  const transfer = useRef<AbortController | null>(null), watchdog = useRef<ReturnType<typeof watchConversion> | null>(null);
  const key = `${provider}-${attempt}`, activePage = useRef(key); activePage.current = key;
  const page = converterPage(provider, videoLink);
  const actualQuality = qualityForProvider(provider, quality);
  const workerActive = !error && !['downloading', 'saving', 'complete'].includes(phase);
  const busy = !error && phase !== 'complete';
  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted.current) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted.current = false; subscription.remove(); transfer.current?.abort(); watchdog.current?.stop(); };
  }, []);
  useEffect(() => {
    watchdog.current = watchConversion(() => fail('This source stopped responding. Try again or use the fallback.'), undefined, 20_000);
    return () => watchdog.current?.stop();
  }, [provider, attempt]);
  useEffect(() => { if (busy && !reduceMotion) animation.current?.play(); else animation.current?.pause(); }, [busy, reduceMotion]);
  function fail(message: string) {
    accepted.current = true; watchdog.current?.stop(); setError(message);
  }
  function close() { activePage.current = ''; transfer.current?.abort(); watchdog.current?.stop(); onClose(); }
  function restart(next: typeof provider) {
    activePage.current = ''; transfer.current?.abort(); watchdog.current?.stop(); accepted.current = false;
    setProvider(next); setAttempt(n => n + 1); setError(''); setVerificationFailed(false); setPhase('connecting'); setJobId(undefined); setPreparationPercent(null); setBytes({ received: 0, total: 0 });
  }
  async function receive(message: string, origin: string) {
    if (key !== activePage.current || !converterOrigin(origin) || accepted.current) return;
    let data;
    try { data = JSON.parse(message); } catch { return; }
    if (data.type === 'lilt-title' && typeof data.title === 'string') { setSongTitle(data.title.replace(/[\x00-\x1f]/g, '').slice(0, 200)); return; }
    if (data.type === 'lilt-error') { setVerificationFailed(data.reason === 'verification'); fail(data.reason === 'verification' ? 'This source rejected the connection. Continue with the 192 kbps fallback, or cancel.' : 'This source could not prepare your song. Try again or use the fallback.'); return; }
    if (data.type === 'lilt-progress' && ['connecting', 'verifying', 'preparing', 'extracting', 'converting'].includes(data.stage)) {
      watchdog.current?.progress(`${data.stage}:${typeof data.progress === 'number' ? data.progress : ''}`, ['connecting', 'verifying'].includes(data.stage) ? 20_000 : 60_000);
      if (typeof data.progress === 'number' && Number.isFinite(data.progress)) setPreparationPercent(Math.max(0, Math.min(100, Math.round(data.progress))));
      setPhase(data.stage); return;
    }
    const download = converterDownload(message);
    if (!download) return;
    setSongTitle(download.filename.replace(/\.[^.]+$/, ''));
    accepted.current = true; watchdog.current?.stop(); setPhase('downloading'); setError('');
    const controller = new AbortController(); transfer.current = controller;
    try {
      await onDownload(download.url, download.filename, controller.signal, state => {
        if (!mounted.current || controller.signal.aborted || key !== activePage.current) return;
        setPhase(state.phase); setJobId(state.jobId); setBytes({ received: state.received, total: state.total });
      });
      if (mounted.current && !controller.signal.aborted && key === activePage.current) setPhase('complete');
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted && key === activePage.current) fail(cause instanceof Error ? cause.message : 'Could not save this song. Try again.');
    }
  }
  const percent = downloadPercent(bytes.received, bytes.total);
  const visiblePercent = workerActive ? preparationPercent ?? 0 : percent;
  useEffect(() => { onUpdate({ title: songTitle, phase, percent: phase === 'complete' ? 100 : workerActive ? preparationPercent : percent, received: bytes.received, total: bytes.total, error: error || null, playlistId, jobId }); }, [songTitle, phase, workerActive, preparationPercent, percent, bytes.received, bytes.total, error, playlistId, jobId, onUpdate]);
  useEffect(() => () => onUpdate(null), [onUpdate]);
  return <>
        {workerActive && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
          <WebView key={key} source={{ uri: page }} style={{ flex: 1 }}
            injectedJavaScriptBeforeContentLoaded={converterBridge(provider, actualQuality)} injectedJavaScript={converterBridge(provider, actualQuality)}
            onMessage={event => { void receive(event.nativeEvent.data, event.nativeEvent.url); }}
            onFileDownload={event => { void receive(JSON.stringify({ type: 'lilt-download', url: event.nativeEvent.downloadUrl }), page); }}
            onError={() => { if (!accepted.current && key === activePage.current) fail('Could not reach this source. Check your connection or use the fallback.'); }}
            onHttpError={event => { if (!accepted.current && key === activePage.current && event.nativeEvent.url === page) fail('This source is unavailable. Try the fallback.'); }}
            originWhitelist={['*']} onShouldStartLoadWithRequest={request => {
              if (request.isTopFrame === false) return request.url.startsWith('https://') || request.url === 'about:blank';
              if (/\.mp3(?:$|[?#])/i.test(request.url)) { void receive(JSON.stringify({ type: 'lilt-download', url: request.url }), page); return false; }
              return converterOrigin(request.url) || request.url === 'about:blank';
            }}
            javaScriptCanOpenWindowsAutomatically={false} onOpenWindow={() => {}}
            setSupportMultipleWindows javaScriptEnabled domStorageEnabled sharedCookiesEnabled
            allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
            mixedContentMode="never" mediaPlaybackRequiresUserAction
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.canvas }]} />
        </View>}
    <Modal visible={visible} animationType={reduceMotion ? 'fade' : 'slide'} onRequestClose={onMinimize}>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={[s.spread, { paddingHorizontal: 22, paddingVertical: 12 }]}><Text style={s.section}>Add to your music</Text><IconButton name="chevron-down" label="Minimize download" onPress={onMinimize} /></View>
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ flexGrow: 1, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 18 }}>
          {error ? <View style={{ padding: 28 }}><Icon name="alert-circle" color={c.accent} size={52} /></View> : phase === 'complete' ? <View style={{ padding: 28 }}><Icon name="check-circle" color={c.green} size={60} /></View> :
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><LottieView ref={animation} source={require('../../assets/animations/loading.json')} colorFilters={['star2', 'star1', 'note 2', 'ellipse'].map(keypath => ({ keypath, color: c.accent }))} loop autoPlay={busy && !reduceMotion} progress={reduceMotion ? 0.4 : undefined} style={{ width: 210, height: 210 }} /></View>}
          <View accessibilityLiveRegion="polite" style={{ gap: 10, alignItems: 'center', maxWidth: 340 }}>
            <Text style={[s.title, { fontSize: 30, lineHeight: 37, textAlign: 'center' }]}>{error ? 'Your song needs another try' : titles[phase]}</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>{error || (phase === 'complete' ? 'Saved to your collection. Play it anytime, even offline.' : phase === 'saving' ? 'Checking the audio and saving it on this device.' : phase === 'downloading' ? 'Your audio is on its way. Lilt will save it automatically.' : phase === 'verifying' ? 'The audio source is checking this connection before preparation can start.' : 'Keep Lilt open. Your song will join your collection when it is ready.')}</Text>
            <Text style={s.label}>MP3 · {actualQuality} kbps</Text>
          </View>
          {(workerActive || phase === 'downloading') && !error && <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
            <View style={s.spread}><Text style={s.label}>{workerActive ? 'Preparation' : 'Download'}</Text><Text style={[s.label, { fontVariant: ['tabular-nums'] }]}>{visiblePercent !== null ? `${visiblePercent}%` : 'In progress'}</Text></View>
            <View accessibilityRole="progressbar" accessibilityLabel={workerActive ? 'Audio preparation' : 'Audio download'} accessibilityValue={workerActive && preparationPercent === null ? { text: 'Waiting for source progress' } : visiblePercent !== null ? { min: 0, max: 100, now: visiblePercent } : { text: 'Downloading audio' }} style={{ height: 5, borderRadius: 3, backgroundColor: c.rail }}><View style={{ height: 5, borderRadius: 3, backgroundColor: c.accent, width: `${visiblePercent ?? 0}%` }} /></View>
            <Text style={[s.muted, { textAlign: 'center' }]}>{workerActive ? preparationPercent === null ? 'Waiting for source progress' : 'Preparing your audio' : bytes.received > 0 ? `${formatBytes(bytes.received)}${bytes.total > 0 ? ` of ${formatBytes(bytes.total)}` : ''}` : 'Starting download…'}</Text>
          </View>}
        </ScrollView>
      </View>
      <View style={{ padding: 24, paddingTop: 14, gap: 10, backgroundColor: c.surface }}>
        {phase === 'complete' && !error ? <Button label="Back to my music" icon="check" onPress={onDone} /> : <>
          {error && !verificationFailed ? <Button label="Try again" icon="refresh-cw" onPress={() => restart(provider)} /> : null}
          {(error || workerActive) && <Button secondary={!verificationFailed} label={provider === 'flvto' ? verificationFailed ? 'Continue at 192 kbps' : 'Try fallback · 192 kbps' : `Try original source · ${quality === 192 ? 320 : quality} kbps`} onPress={() => restart(provider === 'flvto' ? 'ytmp3' : 'flvto')} />}
          {verificationFailed ? <Button quiet label="Retry selected quality" icon="refresh-cw" onPress={() => restart(provider)} /> : null}
          <Button quiet label="Cancel download" onPress={close} />
        </>}
      </View>
    </SafeAreaView>
  </Modal></>;
}
