import { IngestButton } from "./ingest-button";
import { BackfillButton } from "./backfill-button";
import { SovPanel } from "./sov-panel";
import { TrendPanel } from "./trend-panel";
import { FilteredAlerts } from "./filtered-alerts";
import { SourceStatus } from "./source-status";
import { SpeakerPipeline } from "./speaker-pipeline";
import { SummaryBar } from "./summary-bar";
import { IntelligenceTabs } from "./intelligence-tabs";
import { SchedulerStatus } from "./scheduler-status";

interface ClientData {
  id: string;
  name: string;
}

interface AlertData {
  id: string;
  type: string;
  urgency: string;
  title: string;
  summary: string;
  whyItMatters: string;
  draftResponse: string | null;
  spokesperson: string | null;
  sourceUrl: string | null;
  confidence: number | null;
  category: string | null;
  targetMedia: string | null;
  dataPoints: string | null;
  status: string;
  outcome: string | null;
  outcomeNote: string | null;
  outcomeDate: Date | null;
  coverageUrl: string | null;
  createdAt: Date;
}

interface SourceInfo {
  name: string;
  type: string;
  lastFetchedAt: Date | null;
}

interface ClientDashboardProps {
  client: ClientData;
  alerts: AlertData[];
  sources: SourceInfo[];
}

export function ClientDashboard({ client, alerts, sources }: ClientDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Client header + summary bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {client.name}
          </h1>
          <div className="flex items-center gap-2">
            <BackfillButton clientId={client.id} />
            <IngestButton clientId={client.id} />
          </div>
        </div>
        <SummaryBar clientName={client.name} clientId={client.id} />
      </div>

      {/* Filter bar + alerts */}
      <FilteredAlerts initialAlerts={alerts} clientId={client.id} />

      {/* Trend visualisation */}
      <TrendPanel clientId={client.id} />

      {/* Share of Voice + Intelligence tabs side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SovPanel clientId={client.id} />
        <IntelligenceTabs clientId={client.id} />
      </div>

      {/* Speaker Pipeline — collapsible */}
      <SpeakerPipeline alerts={alerts} clientId={client.id} />

      {/* Source status — collapsible */}
      <SourceStatus sources={sources} />

      {/* Scheduler status widget */}
      <SchedulerStatus />
    </div>
  );
}
