import { EventEmitter } from 'events';

export const eventBus = new EventEmitter();

// eventBus.setMaxListeners(20); // Increase max listeners if needed
