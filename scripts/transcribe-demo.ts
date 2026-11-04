import { readFile, open, mkdir } from "node:fs/promises";
import { root, save, safe } from "./common";
import {
  inspectWav,
  validateTrialConfirmation,
  transcribeShortAudio,
} from "./assemblyai-transcription";
import { liveDemoSchema } from "../lib/live-demo";

const confirmation = validateTrialConfirmation(
  JSON.parse(
    await readFile(
      root + "/benchmark/runs/free-credit-confirmation.json",
      "utf8",
    ),
  ),
);
const audio = await readFile(root + "/public/audio/integration-check.wav");
const inspected = inspectWav(audio);
if (inspected.durationSeconds > confirmation.maxAudioSeconds)
  throw new Error("Clip exceeds the confirmed credit-use limit");
const key = process.env.ASSEMBLYAI_API_KEY;
if (!key)
  throw new Error("Set ASSEMBLYAI_API_KEY in the private local environment");
await mkdir(root + "/benchmark/runs", { recursive: true });
// Exclusive reservation survives crashes/errors and prevents concurrent or
// accidental repeat submissions. A retry must never silently reset this file.
const ledgerPath = root + "/benchmark/runs/assemblyai-demo-reservation.json";
const reservation = await open(ledgerPath, "wx", 0o600);
await reservation.writeFile(
  JSON.stringify(
    {
      reservedAt: new Date().toISOString(),
      maxSubmissions: 1,
      audioSha256: inspected.sha256,
      audioSeconds: inspected.durationSeconds,
      maxOutOfPocketUsd: 0,
      accountBasis:
        "User-confirmed free account, free credits, no payment method, no auto-pay",
    },
    null,
    2,
  ) + "\n",
);
await reservation.close();
try {
  const result = await transcribeShortAudio(audio, key, {
    fetch,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => performance.now(),
  });
  const evidence = liveDemoSchema.parse({
    status: "completed",
    completedAt: new Date().toISOString(),
    provider: "AssemblyAI",
    audio: {
      path: "/audio/integration-check.wav",
      durationSeconds: inspected.durationSeconds,
      sha256: inspected.sha256,
      sourceUrl: "https://assembly.ai/wildfires.mp3",
      description:
        "Six-second excerpt from the official AssemblyAI documentation sample.",
    },
    ...result,
    billing: {
      mode: "free-credits-only",
      maxOutOfPocketUsd: 0,
      creditsDebitedUsd: null,
      basis:
        "User-confirmed free account without a payment method or auto-pay; provider did not report a credit debit amount.",
    },
  });
  if (evidence.status !== "completed")
    throw new Error("Unexpected evidence status");
  await save("public/live-transcription.json", evidence);
  await save("benchmark/runs/assemblyai-demo-result.json", {
    status: "completed",
    audioSha256: inspected.sha256,
    requests: result.requests.length,
    completedAt: evidence.completedAt,
  });
  console.log(
    `Actual AssemblyAI transcription completed: ${inspected.durationSeconds.toFixed(1)} seconds of audio; ${result.requests.length} bounded API requests. Credential and upload URL were not published.`,
  );
} catch (error) {
  await save("benchmark/runs/assemblyai-demo-result.json", {
    status: "failed",
    message: safe(
      error instanceof Error ? error.message : "Transcription failed",
    ),
    reservationRetained: true,
  });
  console.error(
    safe(error instanceof Error ? error.message : "Transcription failed"),
  );
  process.exitCode = 1;
}
