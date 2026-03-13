"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface ClientOption {
  id: string;
  name: string;
  slug: string;
}

export function ClientSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);

  const currentClientId = searchParams.get("client") ?? "";

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data: ClientOption[]) => {
        setClients(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const clientId = e.target.value;
    // Stay on the current page, just update the client param
    if (clientId) {
      router.push(`${pathname}?client=${clientId}`);
    } else {
      router.push(pathname);
    }
  }

  if (loading) {
    return (
      <div className="h-8 w-32 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
    );
  }

  if (clients.length <= 1) return null;

  return (
    <select
      value={currentClientId}
      onChange={handleChange}
      className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
    >
      {!currentClientId && (
        <option value="">Select client...</option>
      )}
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
