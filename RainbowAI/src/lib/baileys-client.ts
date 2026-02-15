/**
 * Baileys Client - Backward Compatibility Layer
 *
 * This file now re-exports from the modular whatsapp/ directory.
 * All implementation has been moved to:
 *   - whatsapp/types.ts
 *   - whatsapp/lid-mapper.ts
 *   - whatsapp/instance.ts
 *   - whatsapp/manager.ts
 *   - whatsapp/index.ts
 *
 * This file exists solely for backward compatibility with existing imports.
 */

export {
  // Types
  type WhatsAppInstanceStatus,
  type MessageHandler,

  // Classes
  WhatsAppInstance,
  WhatsAppManager,
  LidMapper,

  // Singleton
  whatsappManager,

  // Public API Functions
  initBaileys,
  registerMessageHandler,
  getWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppMedia,
  sendWhatsAppTypingIndicator,
  logoutWhatsApp,
  formatPhoneNumber
} from './whatsapp/index.js';
