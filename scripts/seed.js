import { config } from '../src/config.js';
import { openDatabase,createStore } from '../src/database.js';
const store=createStore(openDatabase(config.databasePath));
console.log(`Updated ${store.updateSeed()} sample catalogue entries. Existing plans and history were preserved.`);store.close();
