// Node 24 ejecuta TypeScript quitando los tipos, pero no traduce los imports './x.js' a './x.ts'.
import { register } from 'node:module';

register('./resolver-ts.mjs', import.meta.url);
