import Link from "next/link";
import { Analyzer } from "@/components/analyzer";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Screen recording → bug report</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Upload a recording of a broken flow. You get starting conditions, ordered steps with frames, the observed
            failure, and a clear split between what is on screen, what the speaker claims and what is unknown.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          Demo app with a defect:{" "}
          <Link className="underline" href="/demo">
            /demo
          </Link>{" "}
          · fixed:{" "}
          <Link className="underline" href="/demo?fixed=1">
            /demo?fixed=1
          </Link>
        </p>
      </header>
      <Analyzer />
    </main>
  );
}
