import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          News Room
        </h1>
        <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-400">
          Media intelligence by Frame
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
