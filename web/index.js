import { Engine } from '../cli/Engine.js';
import { App } from './components/App/App.js';
import { setTrace } from './utils/Debug.js';

window.Engine = Engine;
window.setTrace = setTrace;

const app = new App();
await app.mount();
