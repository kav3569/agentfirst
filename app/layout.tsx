import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AgentFirst — AssemblyAI integration benchmark",
  description:
    "Reproducible coding-agent integration evaluations. Inspect task-level evidence, compare skills, and export verified results.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
