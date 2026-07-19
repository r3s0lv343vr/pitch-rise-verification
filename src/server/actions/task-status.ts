import { TaskStatus } from "@prisma/client";

export function parseStatus(value: string): TaskStatus {
  if (Object.values(TaskStatus).includes(value as TaskStatus)) return value as TaskStatus;
  return TaskStatus.TODO;
}
