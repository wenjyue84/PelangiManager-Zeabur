import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";
import { shouldEnablePWA } from "@shared/utils";

// Register service worker for PWA functionality (including push notifications)
// Use centralized environment detection utility
const shouldRegisterSW = shouldEnablePWA();

if (shouldRegisterSW) {
  // First, unregister any existing service workers to force update
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      const unregisterPromises = registrations.map(reg => {
        console.log('Unregistering old service worker:', reg.scope);
        return reg.unregister();
      });
      
      return Promise.all(unregisterPromises);
    }).then(() => {
      // Clear all caches to ensure fresh start
      if ('caches' in window) {
        return caches.keys().then(names => {
          console.log('Clearing old caches:', names);
          return Promise.all(names.map(name => caches.delete(name)));
        });
      }
    }).then(() => {
      // Now register the new service worker
      return registerServiceWorker();
    }).then((manager) => {
      console.log('Service Worker registered successfully (after cleanup)');
      
      // Listen for service worker updates
      manager.addEventListener('waiting', () => {
        console.log('New version available - service worker waiting');
        // Auto skip waiting for immediate update
        manager.skipWaiting();
      });
      
      manager.addEventListener('controlling', () => {
        console.log('New version activated - not auto-reloading');
        // window.location.reload(); // Disabled to prevent deployment conflicts
      });
    }).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  } else {
    // Fallback if cleanup fails
    registerServiceWorker()
      .then((manager) => {
        console.log('Service Worker registered successfully');
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
} else {
  console.log('Service Worker registration skipped - environment not supported');
}

createRoot(document.getElementById("root")!).render(<App />);
