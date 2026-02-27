import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress WebGL warnings from Spline/THREE.js (harmless shader compiler warnings)
// Note: Some warnings may still appear if they come from inside the Spline iframe
// due to browser security restrictions (cross-origin iframe console messages can't be intercepted)
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;
  
  const shouldSuppress = (message) => {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('three.webglprogram') ||
      lowerMessage.includes('program info log') ||
      lowerMessage.includes('warning x3557') ||
      lowerMessage.includes('warning x4008') ||
      lowerMessage.includes('loop only executes') ||
      lowerMessage.includes('floating point division by zero') ||
      lowerMessage.includes('runtime.js') && (lowerMessage.includes('warning') || lowerMessage.includes('x3557') || lowerMessage.includes('x4008'))
    );
  };
  
  console.warn = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    if (shouldSuppress(message)) {
      return; // Suppress these warnings
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    if (shouldSuppress(message)) {
      return; // Suppress these warnings
    }
    originalError.apply(console, args);
  };
  
  console.log = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    // Only suppress if it's clearly a WebGL warning
    if (shouldSuppress(message) && message.includes('warning')) {
      return; // Suppress WebGL warnings in log
    }
    originalLog.apply(console, args);
  };
}

// JSX version: no non-null assertion or TS import
createRoot(document.getElementById("root")).render(<App />);
