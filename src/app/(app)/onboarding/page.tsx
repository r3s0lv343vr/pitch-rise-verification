import { completeOnboardingAction } from "@/app/actions";
import { requireSession } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";

export default async function OnboardingPage() {
  await requireSession();

  return (
    <div>
      <PageHeader
        title="Onboarding setup"
        subtitle="Name the org, create the first project, and land in a workspace ready for the cohort."
      />
      <Card className="max-w-2xl">
        <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm text-slate-400">
          <li>Organization name</li>
          <li>First project + budget</li>
          <li>Default phases created automatically</li>
          <li>Jump into the project workspace</li>
        </ol>
        <form action={completeOnboardingAction} className="space-y-3">
          <div>
            <Label htmlFor="orgName">Organization name</Label>
            <Input id="orgName" name="orgName" defaultValue="Hult Cohort Summer 26" required />
          </div>
          <div>
            <Label htmlFor="projectName">First project</Label>
            <Input id="projectName" name="projectName" defaultValue="Cohort Operating Cadence" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue="Primary delivery board for the pilot." />
          </div>
          <div>
            <Label htmlFor="overallBudget">Overall budget</Label>
            <Input id="overallBudget" name="overallBudget" type="number" defaultValue={25000} />
          </div>
          <Button type="submit">Finish onboarding</Button>
        </form>
      </Card>
    </div>
  );
}
