import { liveDemoSchema } from "../../lib/live-demo";
import evidence from "../../public/live-transcription.json";
import Experience from "./experience";
export const metadata = {
  title: "AssemblyAI transcription demo — AgentFirst",
  description:
    "Play a short audio example and inspect a real AssemblyAI transcription, word timestamps and bounded API request history.",
};
export default function IntegrationPage() {
  return <Experience evidence={liveDemoSchema.parse(evidence)} />;
}
