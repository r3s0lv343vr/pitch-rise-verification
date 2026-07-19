"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WALKTHROUGH_COPY, type WalkthroughStep } from "@/lib/walkthrough";
import { useWalkthrough } from "@/components/walkthrough/walkthrough-context";
import { TourSpotlight } from "@/components/walkthrough/tour-spotlight";
import { Button } from "@/components/ui/button";

function selectorForStep(step: WalkthroughStep, highlightProjectId?: string | null) {
  switch (step) {
    case "projects-nav":
      return '[data-tour="projects-nav"]';
    case "project-name":
      return '[data-tour="project-name"]';
    case "project-description":
      return '[data-tour="project-description"]';
    case "project-budget":
      return '[data-tour="project-budget"]';
    case "project-create":
      return '[data-tour="project-create"]';
    case "project-highlight":
      return highlightProjectId
        ? `[data-tour="project-card"][data-project-id="${highlightProjectId}"]`
        : '[data-tour="project-card"][data-tour-highlight="1"]';
    default:
      return null;
  }
}

function isProjectWorkspacePath(pathname: string) {
  // /projects/[id] or /projects/[id]/...
  return /^\/projects\/[^/]+/.test(pathname);
}

export function BeginnerWalkthrough() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, active, setStep, skip, complete, requestOpenMenu } = useWalkthrough();

  // After project create redirect: ?highlight=id&tour=created
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    const tour = searchParams.get("tour");
    if (tour === "created" && highlight) {
      setStep("project-highlight", { highlightProjectId: highlight });
    }
  }, [searchParams, setStep]);

  // First-login: nudge Projects nav, then advance once on /projects list
  useEffect(() => {
    if (!active) return;
    if (state.step !== "projects-nav") return;
    if (pathname === "/projects") {
      setStep("project-name");
      return;
    }
    // Suggest opening the menu, but never trap the user there.
    requestOpenMenu();
  }, [active, state.step, pathname, requestOpenMenu, setStep]);

  // If the user leaves the create flow into a project workspace, end the tour
  // so Project tabs + hamburger stay fully usable.
  useEffect(() => {
    if (!active) return;
    if (state.step === "project-highlight") return;
    if (isProjectWorkspacePath(pathname)) {
      complete();
    }
  }, [active, state.step, pathname, complete]);

  // Completing the highlight step when they open the project
  useEffect(() => {
    if (!active) return;
    if (state.step === "project-highlight" && state.highlightProjectId) {
      if (pathname === `/projects/${state.highlightProjectId}` || pathname.startsWith(`/projects/${state.highlightProjectId}/`)) {
        complete();
      }
    }
  }, [active, state.step, state.highlightProjectId, pathname, complete]);

  const copy = useMemo(() => {
    if (!active || state.step === "done") return null;
    // Only show coach UI on routes where the step actually applies
    if (state.step === "projects-nav" && pathname === "/projects") return null;
    if (
      (state.step === "project-name" ||
        state.step === "project-description" ||
        state.step === "project-budget" ||
        state.step === "project-create") &&
      pathname !== "/projects"
    ) {
      return null;
    }
    if (state.step === "project-highlight" && pathname !== "/projects") return null;
    return WALKTHROUGH_COPY[state.step];
  }, [active, state.step, pathname]);

  const selector = active && copy ? selectorForStep(state.step, state.highlightProjectId) : null;
  const vibrate =
    state.step === "projects-nav" ||
    state.step === "project-create" ||
    state.step === "project-highlight";

  if (!active || !copy) return null;

  return (
    <>
      <TourSpotlight targetSelector={selector} vibrate={vibrate} />
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[55] w-[min(92vw,420px)] -translate-x-1/2">
        <div className="pointer-events-auto rounded-2xl border border-cyan-400/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/90">
            Beginner walkthrough
          </div>
          <h2 className="text-base font-semibold text-white">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-300">{copy.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.step === "projects-nav" ? (
              <Button type="button" size="sm" onClick={() => requestOpenMenu()}>
                Show Projects
              </Button>
            ) : null}
            {state.step === "project-highlight" ? (
              <Button type="button" size="sm" onClick={() => complete()}>
                Finish walkthrough
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="secondary" onClick={() => skip()}>
              Skip tour
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
