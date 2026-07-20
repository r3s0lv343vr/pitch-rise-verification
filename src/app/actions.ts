/**
 * Server Actions entrypoint.
 * Implementations live in `src/server/actions/*` by domain; this file re-exports
 * the same public API so existing `@/app/actions` imports keep working.
 */
export { signupAction } from "@/server/actions/auth";
export {
  createProjectAction,
  archiveProjectAction,
  completeOnboardingAction,
} from "@/server/actions/projects";
export {
  createTaskAction,
  deleteTaskAction,
  updateTaskStatusAction,
  setTaskStatus,
  assignTaskAction,
  updateTaskMembersAction,
  updateTaskStaffingAction,
  postTaskUpdateAction,
  signOffTaskAction,
} from "@/server/actions/tasks";
export {
  uploadTaskDocumentAction,
  deleteTaskDocumentAction,
} from "@/server/actions/documents";
export { clockInAction, clockOutAction } from "@/server/actions/time";
export {
  createMilestoneAction,
  createRiskAction,
  createIssueAction,
  createChangeRequestAction,
  updateBudgetAction,
  updateMilestoneBudgetAction,
} from "@/server/actions/project-meta";
export {
  listProjectMessagesAction,
  sendProjectMessageAction,
  getProjectChatMetaAction,
} from "@/server/actions/chat";
export { toggleIntegrationAction, ensureIntegrationsAction } from "@/server/actions/integrations";
