import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";

// Register service worker for PWA functionality
registerServiceWorker()
  .then((manager) => {
    console.log('Service Worker registered successfully');
    
    // Listen for service worker updates
    manager.addEventListener('waiting', () => {
      console.log('New version available - service worker waiting');
    });
    
    manager.addEventListener('controlling', () => {
      console.log('New version activated - reloading page');
      window.location.reload();
    });
  })
  .catch((error) => {
    console.error('Service Worker registration failed:', error);
  });

createRoot(document.getElementById("root")!).render(<App />);
