/**
 * Workflow Testing Module
 * Interactive workflow simulator for testing multi-step workflows
 */

import { api, escapeHtml as esc } from '../core/utils.js';

// Module-level state
let testWorkflowData = null;
let testWorkflowCurrentStep = 0;
let testWorkflowMessages = [];

/**
 * Load workflow test steps preview
 * Called when user selects a workflow from dropdown
 */
export function loadWorkflowTestSteps() {
  const select = document.getElementById('test-workflow-select');
  const workflowId = select.value;

  if (!workflowId) {
    document.getElementById('test-workflow-steps').classList.add('hidden');
    document.getElementById('test-workflow-chat').classList.add('hidden');
    return;
  }

  const workflow = window.cachedWorkflows?.workflows.find(w => w.id === workflowId);
  if (!workflow) return;

  testWorkflowData = workflow;

  // Show steps preview
  const stepsList = document.getElementById('test-steps-list');
  stepsList.innerHTML = workflow.steps.map((step, idx) => `
    <div class="flex items-start gap-2 text-xs">
      <span class="font-semibold text-blue-700 min-w-[60px]">Step ${idx + 1}:</span>
      <span class="text-neutral-600">${esc(step.message.en)}</span>
      ${step.waitForReply ? '<span class="ml-auto text-blue-500 italic">⏳ Waits</span>' : '<span class="ml-auto text-green-500 italic">✓ Auto</span>'}
    </div>
  `).join('');

  document.getElementById('test-workflow-steps').classList.remove('hidden');
  document.getElementById('test-workflow-chat').classList.remove('hidden');
  resetWorkflowTest();
}

/**
 * Reset workflow test to initial state
 */
export function resetWorkflowTest() {
  testWorkflowCurrentStep = 0;
  testWorkflowMessages = [];
  const chatBox = document.getElementById('test-chat-messages');
  chatBox.innerHTML = '<div class="text-center text-blue-400 text-sm py-8">Click "Begin Test" to start the workflow simulation</div>';

  document.getElementById('test-user-input').disabled = true;
  document.getElementById('test-send-btn').disabled = true;
  document.getElementById('test-begin-btn').disabled = false;
  document.getElementById('test-step-indicator').classList.add('hidden');
}

/**
 * Begin workflow test execution
 */
export async function beginWorkflowTest() {
  if (!testWorkflowData) return;

  testWorkflowCurrentStep = 0;
  testWorkflowMessages = [];

  document.getElementById('test-begin-btn').disabled = true;
  document.getElementById('test-step-indicator').classList.remove('hidden');

  // Execute first step
  await executeWorkflowStep();
}

/**
 * Execute current workflow step
 */
export async function executeWorkflowStep() {
  if (!testWorkflowData || testWorkflowCurrentStep >= testWorkflowData.steps.length) {
    // Workflow complete - send real WhatsApp message
    document.getElementById('test-user-input').disabled = true;
    document.getElementById('test-send-btn').disabled = true;
    document.getElementById('test-current-step-text').textContent = 'Sending summary...';

    try {
      // Get admin phone from workflow settings
      const workflowSettings = await api('/workflow');
      const adminPhone = workflowSettings.payment?.forward_to || '+60127088789';

      // Prepare collected data
      const collectedData = {};
      testWorkflowMessages.forEach(msg => {
        if (msg.role === 'user') {
          const step = testWorkflowData.steps[msg.step - 1];
          if (step) {
            collectedData[step.id] = msg.message;
          }
        }
      });

      // Send summary via API
      const result = await api('/test-workflow/send-summary', {
        method: 'POST',
        body: {
          workflowId: testWorkflowData.id,
          collectedData,
          phone: adminPhone
        }
      });

      appendTestMessage('system', `✅ Workflow completed! Summary sent to ${adminPhone} via WhatsApp`);
      document.getElementById('test-current-step-text').textContent = 'Finished & Sent';
    } catch (err) {
      console.error('Failed to send summary:', err);
      appendTestMessage('system', `✅ Workflow completed! (Failed to send WhatsApp: ${err.message})`);
      document.getElementById('test-current-step-text').textContent = 'Finished (send failed)';
    }
    return;
  }

  const step = testWorkflowData.steps[testWorkflowCurrentStep];
  const stepNumber = testWorkflowCurrentStep + 1;

  // Update step indicator
  document.getElementById('test-current-step-text').textContent = `${stepNumber}/${testWorkflowData.steps.length} - ${step.id}`;

  // Add bot message
  appendTestMessage('bot', step.message.en);
  testWorkflowMessages.push({ role: 'bot', message: step.message.en, step: stepNumber });

  // If step waits for reply, enable input
  if (step.waitForReply) {
    document.getElementById('test-user-input').disabled = false;
    document.getElementById('test-send-btn').disabled = false;
    document.getElementById('test-user-input').focus();
  } else {
    // Auto-advance to next step
    testWorkflowCurrentStep++;
    setTimeout(async () => await executeWorkflowStep(), 500);
  }
}

/**
 * Send test user message (user input in workflow test)
 */
export async function sendTestMessage() {
  const input = document.getElementById('test-user-input');
  const message = input.value.trim();

  if (!message) return;

  // Add user message
  appendTestMessage('user', message);
  testWorkflowMessages.push({ role: 'user', message, step: testWorkflowCurrentStep + 1 });

  input.value = '';
  input.disabled = true;
  document.getElementById('test-send-btn').disabled = true;

  // Move to next step
  testWorkflowCurrentStep++;

  // Execute next step after a short delay
  setTimeout(async () => await executeWorkflowStep(), 300);
}

/**
 * Append a message to the test chat UI
 * @param {string} role - 'user', 'bot', or 'system'
 * @param {string} text - Message text
 */
export function appendTestMessage(role, text) {
  const chatBox = document.getElementById('test-chat-messages');

  // Clear placeholder if this is first message
  if (chatBox.children.length === 1 && chatBox.children[0].textContent.includes('Begin Test')) {
    chatBox.innerHTML = '';
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `mb-3 ${role === 'user' ? 'text-right' : 'text-left'}`;

  if (role === 'system') {
    messageDiv.innerHTML = `
      <div class="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold border border-green-300">
        ${esc(text)}
      </div>
    `;
  } else if (role === 'bot') {
    messageDiv.innerHTML = `
      <div class="inline-block bg-blue-100 text-blue-900 px-4 py-2.5 rounded-xl text-sm max-w-[80%]">
        <div class="text-xs text-blue-500 mb-1">🤖 Rainbow</div>
        ${esc(text)}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="inline-block bg-white border border-blue-200 text-neutral-800 px-4 py-2.5 rounded-xl text-sm max-w-[80%]">
        <div class="text-xs text-neutral-400 mb-1">👤 User</div>
        ${esc(text)}
      </div>
    `;
  }

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Populate workflow test select dropdown
 * Called when workflows are loaded/updated
 */
export function updateWorkflowTestSelect() {
  const select = document.getElementById('test-workflow-select');
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Choose a workflow --</option>';

  (window.cachedWorkflows?.workflows || []).forEach(w => {
    const option = document.createElement('option');
    option.value = w.id;
    option.textContent = `${w.name} (${w.steps.length} steps)`;
    select.appendChild(option);
  });

  // Restore selection if it still exists
  if (currentValue && window.cachedWorkflows?.workflows.some(w => w.id === currentValue)) {
    select.value = currentValue;
  }
}
