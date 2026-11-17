import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Screen recording → bug report</h1>
      <p className="text-zinc-600">
        Upload and report UI comes next. The demo app with the defect is at{" "}
        <Link className="underline" href="/demo">
          /demo
        </Link>{" "}
        (fixed version:{" "}
        <Link className="underline" href="/demo?fixed=1">
          /demo?fixed=1
        </Link>
        ).
      </p>
    </main>
  );
}
