import { HealthCard } from "@/components/dashboard/health-card";
import { UsageCard } from "@/components/dashboard/usage-card";
import { QuickActionButtons } from "@/components/dashboard/quick-action-buttons";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { Web3Card } from "@/components/dashboard/web3-card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your analytics and API status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <HealthCard />
        <UsageCard />
        <Web3Card />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Quick actions</h2>
        <QuickActionButtons />
      </section>

      <RecentActivityCard />
    </div>
  );
}
