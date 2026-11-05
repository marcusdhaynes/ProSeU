'use client';

import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

function mediaSrc(url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (typeof document === 'undefined') return url;
  return new URL(url.replace(/^\//, ''), document.baseURI).toString();
}

export function SectionMedia({ body, audioUrl, videoUrl }: { body: string; audioUrl: string | null; videoUrl: string | null }) {
  return (
    <div className="space-y-3">
      <ReadAloud body={body} audioUrl={audioUrl} />
      {videoUrl && (
        <video
          data-testid="lesson-video"
          controls
          playsInline
          preload="metadata"
          src={mediaSrc(videoUrl)}
          className="w-full rounded-2xl border-2 border-border bg-black"
        />
      )}
    </div>
  );
}

function ReadAloud({ body, audioUrl }: { body: string; audioUrl: string | null }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  if (audioUrl) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2" data-testid="lesson-audio">
        <Volume2 className="h-4 w-4 shrink-0 text-accent" />
        <audio controls preload="none" src={mediaSrc(audioUrl)} className="h-10 w-full">
          Recorded narration
        </audio>
      </div>
    );
  }

  const toggle = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(body);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="lesson-tts"
      className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground hover:border-accent"
    >
      {speaking ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5 text-accent" />}
      {speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
