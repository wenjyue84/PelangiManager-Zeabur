import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";
// CRITICAL: Import path for shared utilities - DO NOT MODIFY without user approval  
// Correct path: "../../shared/utils" (from client/src/main.tsx to shared/utils.ts)
// Incorrect paths like "../shared/utils" cause build failures
// Last fixed: August 23, 2025 - Import path correction during system recovery
import { shouldEnablePWA } from "../../shared/utils";

// Register service worker for PWA functionality (including push notifications)
// Use centralized environment detection utility
const shouldRegisterSW = shouldEnablePWA();

if (shouldRegisterSW) {
  registerServiceWorker()
    .then((manager) => {
      console.log('Service Worker registered successfully');
      
      // Listen for service worker updates
      manager.addEventListener('waiting', () => {
        console.log('New version available - service worker waiting');
      });
      
      manager.addEventListener('controlling', () => {
        console.log('New version activated - not auto-reloading');
        // window.location.reload(); // Disabled to prevent deployment conflicts
      });
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
} else {
  console.log('Service Worker registration skipped - environment not supported');
}

createRoot(document.getElementById("root")!).render(<App />);
