import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
export const backendRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
dotenv.config({path:path.join(backendRoot,'.env'),quiet:true});
const env=z.object({HOST:z.string().default('127.0.0.1'),PORT:z.coerce.number().int().min(1).max(65535).default(3001),DATABASE_PATH:z.string().default('./data/breaktrail.sqlite'),OLLAMA_BASE_URL:z.string().url().default('http://127.0.0.1:11434'),OLLAMA_MODEL:z.string().min(1).default('qwen3:0.6b'),OLLAMA_TIMEOUT_MS:z.coerce.number().int().min(1000).max(300000).default(90000),ALLOW_RULE_FALLBACK:z.enum(['true','false']).default('false'),SERVE_FRONTEND:z.enum(['true','false']).default('false'),CLIENT_ORIGINS:z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:3001,http://127.0.0.1:3001')}).parse(process.env);
export const config={host:env.HOST,port:env.PORT,databasePath:path.resolve(backendRoot,env.DATABASE_PATH),ollamaUrl:env.OLLAMA_BASE_URL.replace(/\/$/,''),model:env.OLLAMA_MODEL,timeoutMs:env.OLLAMA_TIMEOUT_MS,allowFallback:env.ALLOW_RULE_FALLBACK==='true',serveFrontend:env.SERVE_FRONTEND==='true',origins:env.CLIENT_ORIGINS.split(',').map(v=>v.trim()).filter(Boolean)};
