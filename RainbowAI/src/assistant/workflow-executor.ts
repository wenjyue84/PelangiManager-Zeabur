import type { SendMessageFn } from './types.js';
import { configStore } from './config-store.js';
import type { WorkflowDefinition, WorkflowStep } from './config-store.js';
import { enhanceWorkflowStep, WorkflowEnhancerContext } from './workflow-enhancer.js';
import { callAPI as httpClientCallAPI } from '../lib/http-client.js';

// Wrapper to adapt http-client callAPI to workflow-enhancer's expected signature
async function callAPIWrapper(url: string, options?: RequestInit): Promise<any> {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.parse(options.body as string) : undefined;
  return httpClientCallAPI(method, url, body);
}

export interface WorkflowState {
  workflowId: string;
  currentStepIndex: number;
  collectedData: Record<string, string>; // step id -> user response
  startedAt: number;
  lastUpdateAt: number;
}

export interface WorkflowExecutionResult {
  response: string;
  newState: WorkflowState | null; // null when workflow complete
  shouldForward?: boolean; // true on final step
  conversationSummary?: string;
  workflowId?: string;  // For conversation log edit support
  stepId?: string;      // For conversation log edit support
}

let sendMessageFn: SendMessageFn | null = null;

export function initWorkflowExecutor(sendFn: SendMessageFn): void {
  sendMessageFn = sendFn;
}

export function createWorkflowState(workflowId: string): WorkflowState {
  return {
    workflowId,
    currentStepIndex: 0,
    collectedData: {},
    startedAt: Date.now(),
    lastUpdateAt: Date.now()
  };
}

export async function executeWorkflowStep(
  state: WorkflowState,
  userMessage: string | null,
  language: string,
  phone?: string,
  pushName?: string,
  instanceId?: string
): Promise<WorkflowExecutionResult> {
  const workflows = configStore.getWorkflows();
  const workflow = workflows.workflows.find(w => w.id === state.workflowId);

  if (!workflow) {
    return {
      response: 'Workflow not found. Please contact support.',
      newState: null
    };
  }

  // If user provided a message, store it for the previous step
  // BUT only if the previous step wasn't an evaluation step (eval steps don't collect data)
  if (userMessage && state.currentStepIndex > 0) {
    const previousStep = workflow.steps[state.currentStepIndex - 1];
    if (previousStep && !previousStep.evaluation) {
      state.collectedData[previousStep.id] = userMessage;
    }
  }

  // Check if we've completed all steps
  if (state.currentStepIndex >= workflow.steps.length) {
    // Workflow complete - prepare summary and forward
    const summary = buildConversationSummary(workflow, state);
    const adminPhone = configStore.getWorkflow().payment.forward_to || '+60127088789';

    const lastStep = workflow.steps[workflow.steps.length - 1];
    return {
      response: getStepMessage(lastStep, language),
      newState: null,
      shouldForward: true,
      conversationSummary: summary,
      workflowId: state.workflowId,
      stepId: lastStep.id
    };
  }

  const currentStep = workflow.steps[state.currentStepIndex];

  // ─── NEW: Evaluation Logic (Smart Workflows) ──────────────────────
  if (currentStep.evaluation) {
    // This is a silent step. We evaluate and jump, then RECURSE.
    console.log(`[WorkflowExecutor] Running evaluation step ${currentStep.id}...`);

    // We need history for context. Since we don't have seamless access to full DB history here,
    // we'll rely on what we have: userMessage (latest) + collectedData (previous workflow steps).
    // In a real implementation, we'd fetch full history.
    // For now, let's construct a "workflow context" string.

    const contextLines = [];
    for (const [key, val] of Object.entries(state.collectedData)) {
      contextLines.push(`Step ${key}: ${val}`);
    }
    const contextStr = contextLines.join('\n');

    // "History" for the evaluator will include the collected data as a system note
    // and the latest user message.
    const mockHistory: any[] = [
      { role: 'system', content: `Workflow Content So Far:\n${contextStr}` }
    ];

    try {
      const { evaluateWorkflowStep } = await import('./ai-client.js');
      const result = await evaluateWorkflowStep(
        currentStep.evaluation.prompt,
        mockHistory,
        userMessage || '(No new message)'
      );

      console.log(`[WorkflowExecutor] Evaluation "${currentStep.evaluation.prompt}" -> ${result}`);

      const nextStepId = currentStep.evaluation.outcomes[result] || currentStep.evaluation.defaultNextId;
      const nextStepIndex = workflow.steps.findIndex(s => s.id === nextStepId);

      if (nextStepIndex !== -1) {
        // Update state to jump
        const nextState = {
          ...state,
          currentStepIndex: nextStepIndex,
          lastUpdateAt: Date.now()
        };

        // RECURSE! Execute the target step immediately
        // Pass userMessage=null because we haven't "consumed" it yet if we're skipping
        // Wait... actually userMessage IS the current input. If we skip, we want the *next* step
        // to see it potentially? Or strictly distinct?
        // Let's assume evaluation steps are invisible. The user's input triggered the evaluation.
        // The NEXT step will be the "response" to that input.
        return executeWorkflowStep(nextState, null, language, phone, pushName, instanceId);
      } else {
        console.error(`[WorkflowExecutor] Evaluation target step ${nextStepId} not found!`);
      }
    } catch (err) {
      console.error('[WorkflowExecutor] Evaluation failed:', err);
    }

    // Fallback: just advance 1 step if evaluation fails
    // (This shouldn't happen if config is correct)
  }

  let response = getStepMessage(currentStep, language);

  // Enhance step if action present and phone available
  if (currentStep.action && phone && sendMessageFn) {
    const enhancerContext: WorkflowEnhancerContext = {
      workflowId: state.workflowId,
      stepId: currentStep.id,
      userInput: userMessage,
      collectedData: state.collectedData,
      language,
      phone,
      pushName: pushName || 'Guest',
      instanceId
    };

    try {
      const enhanced = await enhanceWorkflowStep(
        currentStep,
        enhancerContext,
        callAPIWrapper,
        sendMessageFn
      );

      response = enhanced.message; // Use enhanced message

      // Log metadata for debugging
      if (enhanced.metadata) {
        console.log(`[WorkflowExecutor] Step ${currentStep.id} metadata:`, enhanced.metadata);
      }
    } catch (error) {
      console.error(`[WorkflowExecutor] Failed to enhance step ${currentStep.id}:`, error);
      // Continue with original message on error (graceful degradation)
    }
  }

  // Update state
  const newState: WorkflowState = {
    ...state,
    lastUpdateAt: Date.now()
  };

  // If this step waits for reply, keep state as-is (will advance on next message)
  // If this step doesn't wait, advance to next step immediately
  if (!currentStep.waitForReply) {
    newState.currentStepIndex = state.currentStepIndex + 1;

    // If there's a next step that also doesn't wait, we need to chain them
    // For now, we'll let the caller handle this by checking the state
  } else {
    // Advance to next step (user will reply to this one)
    newState.currentStepIndex = state.currentStepIndex + 1;
  }

  return {
    response,
    newState,
    shouldForward: false,
    workflowId: state.workflowId,
    stepId: currentStep.id
  };
}

export async function forwardWorkflowSummary(
  phone: string,
  pushName: string,
  workflow: WorkflowDefinition,
  state: WorkflowState,
  instanceId?: string
): Promise<void> {
  if (!sendMessageFn) {
    console.error('[WorkflowExecutor] SendMessage function not initialized');
    return;
  }

  const adminPhone = configStore.getWorkflow().payment.forward_to || '+60127088789';
  const summary = buildConversationSummary(workflow, state, phone, pushName);

  try {
    await sendMessageFn(adminPhone, summary, instanceId);
    console.log(`[WorkflowExecutor] Summary forwarded to ${adminPhone} for ${phone}`);
  } catch (err: any) {
    console.error(`[WorkflowExecutor] Failed to forward summary:`, err.message);
  }
}

function getStepMessage(step: WorkflowStep, language: string): string {
  // Support multi-language responses
  const messages = step.message;
  if (language === 'ms' && messages.ms) return messages.ms;
  if (language === 'zh' && messages.zh) return messages.zh;
  return messages.en;
}

function buildConversationSummary(
  workflow: WorkflowDefinition,
  state: WorkflowState,
  phone?: string,
  pushName?: string
): string {
  const lines: string[] = [];

  lines.push(`📋 *Workflow Summary: ${workflow.name}*`);
  lines.push('');

  if (phone) {
    lines.push(`👤 *Guest:* ${pushName || 'Unknown'}`);
    lines.push(`📱 *Phone:* ${phone}`);
    lines.push('');
  }

  lines.push(`🕐 *Started:* ${new Date(state.startedAt).toLocaleString()}`);
  lines.push(`⏱️ *Duration:* ${Math.round((state.lastUpdateAt - state.startedAt) / 1000)}s`);
  lines.push('');
  lines.push('*Collected Information:*');

  // Match steps with collected data
  workflow.steps.forEach((step, idx) => {
    const response = state.collectedData[step.id];
    if (response) {
      lines.push(`${idx + 1}. ${step.message.en}`);
      lines.push(`   ↳ _${response}_`);
    }
  });

  if (Object.keys(state.collectedData).length === 0) {
    lines.push('_(No responses collected)_');
  }

  lines.push('');
  lines.push('---');
  lines.push('🤖 _Generated by Rainbow AI Assistant_');

  return lines.join('\n');
}

export function hasAutoAdvanceSteps(workflow: WorkflowDefinition, fromIndex: number): boolean {
  // Check if there are consecutive steps that don't wait for reply
  for (let i = fromIndex; i < workflow.steps.length; i++) {
    if (workflow.steps[i].waitForReply) {
      return false;
    }
  }
  return true;
}
