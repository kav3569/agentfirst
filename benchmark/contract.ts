export type RequestSpec = {
  url: string;
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string | Uint8Array;
  };
};
export type Transcript = { status: string; text?: string; error?: string };
export type StreamEvent = {
  type: string;
  turn_order?: number;
  transcript?: string;
  end_of_turn?: boolean;
};
export type RetryResponse = { status: number; retryAfter?: number };

// Each task requires just its named export, not this entire interface.
export interface Solution {
  transcriptionRequest(audioUrl: string, key: string): RequestSpec;
  uploadRequest(audio: Uint8Array, key: string): RequestSpec;
  pollTranscript(
    id: string,
    get: (id: string) => Promise<Transcript>,
    sleep: (ms: number) => Promise<void>,
    maxAttempts: number,
  ): Promise<string>;
  streamingUrl(token: string): string;
  finalTurns(events: StreamEvent[]): string[];
  tokenRequest(key: string, ttl: number): RequestSpec;
  ttsRequest(text: string, key: string): RequestSpec;
  ttsFrames(chunks: string[]): { type: string; text?: string }[];
  bargeIn(
    speaking: boolean,
    transcript: string,
  ): { stopPlayback: boolean; frames: { type: string }[] };
  retryRequest(
    send: () => Promise<RetryResponse>,
    sleep: (ms: number) => Promise<void>,
    maxAttempts: number,
  ): Promise<RetryResponse>;
  redact(text: string, secrets: string[]): string;
  validateAudioUrl(url: string): string;
  cleanupSession(socket: {
    send: (data: string) => void;
    close: () => void;
  }): void;
  regionalEndpoints(region: "us" | "eu"): {
    rest: string;
    streaming: string;
    tts: string;
  };
}
