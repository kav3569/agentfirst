"use client";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  AudioLines,
  Check,
  Clock3,
  FileJson,
  Headphones,
  Play,
  ShieldCheck,
} from "lucide-react";
import type { LiveDemo } from "../../lib/live-demo";

export default function Experience({ evidence }: { evidence: LiveDemo }) {
  const player = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const completed = evidence.status === "completed";
  function seek(ms: number) {
    if (player.current) {
      player.current.currentTime = ms / 1000;
      setTime(ms);
      void player.current.play().catch(() => {});
    }
  }
  return (
    <div className="demo-shell">
      <header className="demo-header">
        <a className="brand" href="/">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          agentfirst<span className="brand-period">.</span>
        </a>
        <a className="demo-back" href="/">
          <ArrowLeft size={14} /> Evaluation dashboard
        </a>
      </header>
      <main className="demo-main">
        <div className="demo-eyebrow">
          <span /> ASSEMBLYAI IN ACTION
        </div>
        <h1>
          A real transcript.
          <br />
          <span>Every step visible.</span>
        </h1>
        <p className="demo-intro">
          A short audio recording, transcribed with AssemblyAI. Play the clip,
          follow each word, and inspect the integration that produced it.
        </p>
        <div className="demo-badges">
          <span>
            <ShieldCheck size={13} /> Free-credit account
          </span>
          <span>
            <Headphones size={13} /> Recorded API example
          </span>
          <span>
            <Check size={13} /> $0 out-of-pocket limit
          </span>
        </div>
        {!completed ? (
          <section className="panel demo-pending">
            <AudioLines size={30} />
            <h2>Waiting for the first API result</h2>
            <p>{evidence.message}</p>
          </section>
        ) : (
          <>
            <section className="demo-player panel">
              <div className="demo-panel-head">
                <div>
                  <span className="eyebrow">INPUT AUDIO</span>
                  <h2>Six seconds. A real transcription.</h2>
                </div>
                <span className="demo-live-badge">
                  <span /> Verified response
                </span>
              </div>
              <p className="demo-caption">
                An excerpt from AssemblyAI’s official documentation sample.
                Playback uses the saved recording and consumes no additional API
                credits.
              </p>
              <audio
                ref={player}
                controls
                preload="metadata"
                src={evidence.audio.path}
                onTimeUpdate={() =>
                  setTime((player.current?.currentTime ?? 0) * 1000)
                }
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              >
                Your browser does not support audio playback.
              </audio>
              <div className="demo-audio-meta">
                <a
                  href={evidence.audio.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Official sample source <ArrowUpRight size={12} />
                </a>
                <span>
                  {evidence.audio.durationSeconds.toFixed(1)}s · WAV · 16 kHz
                  mono
                </span>
              </div>
            </section>
            <div className="demo-result-grid">
              <section className="panel demo-transcript">
                <div className="demo-panel-head">
                  <div>
                    <span className="eyebrow">ASSEMBLYAI TRANSCRIPT</span>
                    <h2>Click a word. Hear it in context.</h2>
                  </div>
                  <span
                    className={
                      isPlaying ? "demo-playing active" : "demo-playing"
                    }
                  >
                    <AudioLines size={15} />
                    {isPlaying ? "Playing" : "Ready"}
                  </span>
                </div>
                <div
                  className="demo-words"
                  aria-label="Transcript with clickable word timestamps"
                >
                  {evidence.words.map((word, index) => (
                    <button
                      key={index}
                      className={
                        time >= word.start && time < word.end ? "current" : ""
                      }
                      onClick={() => seek(word.start)}
                      aria-label={`Play ${word.text} at ${(word.start / 1000).toFixed(2)} seconds`}
                      title={`${(word.start / 1000).toFixed(2)}–${(word.end / 1000).toFixed(2)}s`}
                    >
                      {word.text}
                    </button>
                  ))}
                </div>
                <p className="demo-transcript-note">
                  Word timing comes from the API response. Select any word to
                  seek the recording to its timestamp.
                </p>
              </section>
              <section className="panel demo-stats">
                <h2>What this run measured</h2>
                <dl>
                  <div>
                    <dt>Audio processed</dt>
                    <dd>{evidence.audio.durationSeconds.toFixed(1)} seconds</dd>
                  </div>
                  <div>
                    <dt>End-to-end API latency</dt>
                    <dd>{(evidence.latencyMs / 1000).toFixed(2)} seconds</dd>
                  </div>
                  <div>
                    <dt>Returned model</dt>
                    <dd>{evidence.speechModelUsed ?? "Not reported"}</dd>
                  </div>
                  <div>
                    <dt>Bounded HTTP requests</dt>
                    <dd>{evidence.requests.length}</dd>
                  </div>
                  <div>
                    <dt>Credit debit amount</dt>
                    <dd>
                      {evidence.billing.creditsDebitedUsd === null
                        ? "Not reported by API"
                        : `$${evidence.billing.creditsDebitedUsd}`}
                    </dd>
                  </div>
                </dl>
                <a
                  href="/live-transcription.json"
                  download="agentfirst-live-transcription.json"
                >
                  <FileJson size={14} /> Download the recorded result{" "}
                  <ArrowUpRight size={13} />
                </a>
              </section>
            </div>
            <section className="panel demo-trace">
              <div className="demo-panel-head">
                <div>
                  <span className="eyebrow">REQUEST HISTORY</span>
                  <h2>From audio to transcript.</h2>
                </div>
                <span className="demo-date">
                  {evidence.completedAt.slice(0, 10)} · UTC
                </span>
              </div>
              <div className="demo-trace-list">
                {evidence.requests.map((request, index) => (
                  <div className="demo-trace-row" key={index}>
                    <span className="demo-step">{index + 1}</span>
                    <div>
                      <strong>
                        {request.stage === "upload"
                          ? "Upload the audio"
                          : request.stage === "submit"
                            ? "Create the transcription"
                            : "Check the transcription"}
                      </strong>
                      <small>
                        {request.method} {request.path}
                      </small>
                    </div>
                    <span className="demo-http">
                      <Check size={12} />
                      {request.httpStatus}
                    </span>
                    <span className="demo-timing">
                      {request.latencyMs.toFixed(0)} ms
                    </span>
                  </div>
                ))}
              </div>
              <div className="demo-trace-footer">
                <ShieldCheck size={14} /> One transcription submission. No
                automatic resubmissions. The credential stays in the local
                environment.
              </div>
            </section>
            <section className="demo-scope">
              <div>
                <h3>What this demonstrates</h3>
                <p>
                  A working AssemblyAI upload → transcription → polling
                  integration, with real text and word timestamps, bounded
                  requests, and replayable evidence.
                </p>
              </div>
              <div>
                <h3>What remains to be evaluated</h3>
                <p>
                  This result tests the application’s integration. The baseline,
                  official-skill, and enhanced-skill coding-agent comparison is
                  a separate experiment and has not run yet.
                </p>
              </div>
            </section>
            <div className="demo-source">
              <span className="mono">
                Audio SHA-256 · {evidence.audio.sha256.slice(0, 24)}
              </span>
              <a
                href="https://github.com/kav3569/agentfirst"
                target="_blank"
                rel="noreferrer"
              >
                Inspect the source <ArrowUpRight size={13} />
              </a>
            </div>
          </>
        )}
        <footer className="demo-footer">
          <AudioLines size={15} />
          <span>AgentFirst · Built with AssemblyAI</span>
          <a href="/">
            Explore the benchmark <ArrowUpRight size={12} />
          </a>
        </footer>
      </main>
    </div>
  );
}
