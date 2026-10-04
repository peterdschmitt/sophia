import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { NextResponse } from 'next/server.js';

// Exercise the route with real responses and a network boundary that cannot
// make external requests. Never print authorization values on failure.
function loadRoute(apiKey, fetch) {
  const source = fs.readFileSync(new URL('../src/app/api/settings/route.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.equal(name, 'next/server');
      return { NextResponse };
    },
    process: { env: apiKey === undefined ? {} : { VAPI_API_KEY: apiKey } },
    fetch,
    console: { error() {} },
  });
  return exports;
}

test('GET preserves defaults and skips Vapi when its key is missing', async () => {
  let vapiCalls = 0;
  const route = loadRoute(undefined, async (url) => {
    if (url.startsWith('https://api.vapi.ai/')) {
      vapiCalls++;
      return NextResponse.json({});
    }
    return NextResponse.json({ tts: { openai: { voice: 'coral', instructions: 'Speak slowly' } } });
  });
  const response = await route.GET();
  const data = await response.json();
  assert.equal(vapiCalls, 0, 'Unconfigured GET must not contact Vapi');
  assert.equal(response.status, 200);
  assert.equal(data.openai.voice, 'coral');
  assert.equal(data.openai.instructions, 'Speak slowly');
  assert.equal(data.vapi.voice, 'Jess');
  assert.equal(data.vapi.provider, 'vapi');
});

test('POST refuses Vapi updates without a key', async () => {
  let calls = 0;
  const route = loadRoute(undefined, async () => {
    calls++;
    return NextResponse.json({});
  });
  const response = await route.POST({ json: async () => ({ type: 'vapi', voice: 'Jess' }) });
  assert.equal(response.status, 503);
  assert.equal(calls, 0, 'Unconfigured POST must not contact Vapi');
  assert.equal(typeof (await response.json()).error, 'string');
});

test('GET authenticates Vapi with the configured environment value', async () => {
  let authenticated = false;
  const route = loadRoute('test-only-placeholder', async (url, options) => {
    if (url.startsWith('https://api.vapi.ai/')) {
      authenticated = options.headers.Authorization === 'Bearer test-only-placeholder';
      return NextResponse.json({ voice: { voiceId: 'mark', provider: 'playht' } });
    }
    return NextResponse.json({});
  });
  const data = await (await route.GET()).json();
  assert.equal(authenticated, true, 'Vapi must use the environment credential');
  assert.equal(data.vapi.voice, 'mark');
  assert.equal(data.vapi.provider, 'playht');
});

test('POST authenticates Vapi and sends the requested voice', async () => {
  let authenticated = false;
  let payload;
  const route = loadRoute('test-only-placeholder', async (url, options) => {
    assert.equal(url.startsWith('https://api.vapi.ai/assistant/'), true);
    authenticated = options.headers.Authorization === 'Bearer test-only-placeholder';
    assert.equal(options.method, 'PATCH');
    payload = JSON.parse(options.body);
    return NextResponse.json({});
  });
  const response = await route.POST({ json: async () => ({ type: 'vapi', voice: 'mark' }) });
  assert.equal(response.status, 200);
  assert.equal(authenticated, true, 'Vapi must use the environment credential');
  assert.deepEqual(payload, { voice: { voiceId: 'mark', provider: 'playht' } });
});

test('OpenAI voice updates still work without a Vapi key', async () => {
  let gatewayCalls = 0;
  const route = loadRoute(undefined, async (url) => {
    assert.equal(url.endsWith('/v1/chat/completions'), true);
    gatewayCalls++;
    return NextResponse.json({});
  });
  const response = await route.POST({ json: async () => ({ type: 'openai', voice: 'coral' }) });
  assert.equal(response.status, 200);
  assert.equal(gatewayCalls, 1);
});
