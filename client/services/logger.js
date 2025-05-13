// Set to false to reduce console log verbosity
const DEBUG = false;

// Helper function for conditional logging
export const log = (message, ...args) => {
  if (DEBUG) console.log(message, ...args);
};

// Only log important events regardless of debug mode
export const logImportant = (message, ...args) => {
  console.log(message, ...args);
}; 