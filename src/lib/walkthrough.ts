/** Bumped key so prior trapped tours stop auto-running. */
export const WALKTHROUGH_STORAGE_KEY = "pm-beginner-walkthrough-v2";

export type WalkthroughStep =
  | "projects-nav"
  | "project-name"
  | "project-description"
  | "project-budget"
  | "project-create"
  | "project-highlight"
  | "done";

export type WalkthroughState = {
  status: "active" | "completed" | "skipped";
  step: WalkthroughStep;
  highlightProjectId?: string | null;
};

/** Default OFF — tour is opt-in via "Restart beginner tour" so it cannot trap navigation. */
export const WALKTHROUGH_DEFAULT: WalkthroughState = {
  status: "skipped",
  step: "done",
  highlightProjectId: null,
};

export function readWalkthroughState(): WalkthroughState {
  if (typeof window === "undefined") return WALKTHROUGH_DEFAULT;
  try {
    const raw = window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (!raw) return WALKTHROUGH_DEFAULT;
    const parsed = JSON.parse(raw) as Partial<WalkthroughState>;
    return {
      status: parsed.status ?? "skipped",
      step: parsed.step ?? "done",
      highlightProjectId: parsed.highlightProjectId ?? null,
    };
  } catch {
    return WALKTHROUGH_DEFAULT;
  }
}

export function writeWalkthroughState(next: WalkthroughState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("pm-walkthrough-change", { detail: next }));
}

export function isWalkthroughActive(state: WalkthroughState) {
  return state.status === "active" && state.step !== "done";
}

export const WALKTHROUGH_COPY: Record<
  Exclude<WalkthroughStep, "done">,
  { title: string; body: string }
> = {
  "projects-nav": {
    title: "Start here: Projects",
    body: "Open the menu (☰) and tap Projects. That’s where you create and manage every delivery.",
  },
  "project-name": {
    title: "Name your project",
    body: "Give the project a clear name (for example, Project 2 Comms). Then continue to the description.",
  },
  "project-description": {
    title: "Add a short description",
    body: "Write what this project is about so teammates understand the goal at a glance.",
  },
  "project-budget": {
    title: "Set the overall budget",
    body: "Enter the project budget in USD. You can refine milestone budgets later.",
  },
  "project-create": {
    title: "Create the project",
    body: "Tap Create project + process map. We’ll seed a starter task ladder for you automatically.",
  },
  "project-highlight": {
    title: "Open your new project",
    body: "Nice work — your project is ready. Click the highlighted card to continue building it out.",
  },
};
