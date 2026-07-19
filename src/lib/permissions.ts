import { Role } from "@prisma/client";

export type Permission =
  | "project:create"
  | "project:edit"
  | "project:archive"
  | "task:create"
  | "task:edit"
  | "task:assign"
  | "budget:edit"
  | "risk:edit"
  | "integration:toggle"
  | "team:manage";

const matrix: Record<Role, Permission[]> = {
  ADMIN: [
    "project:create",
    "project:edit",
    "project:archive",
    "task:create",
    "task:edit",
    "task:assign",
    "budget:edit",
    "risk:edit",
    "integration:toggle",
    "team:manage",
  ],
  PM: [
    "project:create",
    "project:edit",
    "project:archive",
    "task:create",
    "task:edit",
    "task:assign",
    "budget:edit",
    "risk:edit",
  ],
  MEMBER: ["task:create", "task:edit", "task:assign", "risk:edit"],
  VIEWER: [],
};

export function can(role: Role | undefined | null, permission: Permission) {
  if (!role) return false;
  return matrix[role]?.includes(permission) ?? false;
}

export function roleLabel(role: Role) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "PM":
      return "Project Manager";
    case "MEMBER":
      return "Member";
    case "VIEWER":
      return "Viewer";
  }
}
