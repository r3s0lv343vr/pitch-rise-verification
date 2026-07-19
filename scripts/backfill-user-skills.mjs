/**
 * Non-destructive backfill of User.skills for existing production rows.
 * Safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

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
];

function skillsFor(user, index) {
  if (user.username === "admin" || user.username === "staff-review") {
    return "Ops, Stakeholder mgmt, Documentation";
  }
  if (user.username === "priya-pm") return "Stakeholder mgmt, Comms, Risk";
  if (user.username === "marcus-dev") return "Full-stack, Backend, QA";
  if (user.username === "vicky-view") return "Research, Documentation";
  if (user.username === "randall") return "Backend, Data, Ops";
  if (user.username === "alpha") return "Frontend, Design, QA";
  const a = SKILL_POOL[index % SKILL_POOL.length];
  const b = SKILL_POOL[(index + 3) % SKILL_POOL.length];
  const c = user.role === "PM" ? "Stakeholder mgmt" : SKILL_POOL[(index + 7) % SKILL_POOL.length];
  return Array.from(new Set([a, b, c])).join(", ");
}

const prisma = new PrismaClient();

const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
let updated = 0;
for (let i = 0; i < users.length; i++) {
  const user = users[i];
  if (user.skills && user.skills.trim()) continue;
  await prisma.user.update({
    where: { id: user.id },
    data: { skills: skillsFor(user, i + 1) },
  });
  updated += 1;
}
console.log(JSON.stringify({ total: users.length, updated }));
await prisma.$disconnect();
