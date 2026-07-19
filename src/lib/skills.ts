const SKILL_POOL = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Design",
  "Research",
  "Comms",
  "Risk",
  "QA",
  "Data",
  "Ops",
  "Stakeholder mgmt",
  "Documentation",
] as const;

/** Deterministic skills for seeded cohort users. */
export function skillsForSeedUser(input: {
  username: string;
  role: string;
  index?: number;
}) {
  if (input.username === "admin" || input.username === "staff-review") {
    return "Ops, Stakeholder mgmt, Documentation";
  }
  if (input.username === "priya-pm") return "Stakeholder mgmt, Comms, Risk";
  if (input.username === "marcus-dev") return "Full-stack, Backend, QA";
  if (input.username === "vicky-view") return "Research, Documentation";
  if (input.username === "randall") return "Backend, Data, Ops";
  if (input.username === "alpha") return "Frontend, Design, QA";

  const i = input.index ?? 0;
  const a = SKILL_POOL[i % SKILL_POOL.length];
  const b = SKILL_POOL[(i + 3) % SKILL_POOL.length];
  const c = input.role === "PM" ? "Stakeholder mgmt" : SKILL_POOL[(i + 7) % SKILL_POOL.length];
  return Array.from(new Set([a, b, c])).join(", ");
}

export function formatUserOption(user: { name: string; username: string; skills?: string | null }) {
  const skills = (user.skills || "").trim();
  return skills ? `${user.name} (@${user.username}) — ${skills}` : `${user.name} (@${user.username})`;
}
