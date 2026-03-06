"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PipelineConfig } from "@/lib/types";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const router = useRouter();
  const [config, setConfig] = useState<PipelineConfig | null | undefined>(
    undefined,
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { config: PipelineConfig | null }) => {
        if (data.config) {
          setConfig(data.config);
        } else {
          router.replace("/setup");
        }
      })
      .catch(() => {
        router.replace("/setup");
      });
  }, [router]);

  if (config === undefined || config === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-border-subtle" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.2em] text-text-muted">
            Loading
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard config={config} />;
}
