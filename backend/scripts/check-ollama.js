import { config } from '../src/config.js';
import { createOllama } from '../src/ollama.js';
const result=await createOllama(config).status();console.log(JSON.stringify(result,null,2));if(!result.ready)process.exitCode=1;
