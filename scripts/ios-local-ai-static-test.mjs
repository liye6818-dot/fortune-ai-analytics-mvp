import fs from "node:fs";
import assert from "node:assert/strict";

const entryFiles = ["app.js", "app-mobile-visible.js", "main.js", "pwa/app.js"];
for (const file of entryFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.match(source, /navigator\.gpu/, `${file}: WebGPU check`);
  assert.match(source, /CreateMLCEngine/, `${file}: WebLLM engine`);
  assert.match(source, /cacheBackend:\s*"indexeddb"/, `${file}: persistent model cache`);
  assert.match(source, /model-download-cancelled/, `${file}: download confirmation handling`);
  assert.match(source, /手机AI模型下载中/, `${file}: download progress`);
  assert.match(source, /askLocalAi\(prompt\)/, `${file}: shared AI route`);
  assert.match(source, /fortune_ios_ai_private_test_v1/, `${file}: private test gate`);
  assert.match(source, /iosai/, `${file}: private activation link`);
}

for (const file of ["config.js", "pwa/config.js"]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.match(source, /Qwen2\.5-0\.5B-Instruct-q4f16_1-MLC/, `${file}: mobile model`);
  assert.match(source, /@mlc-ai\/web-llm@0\.2\.84/, `${file}: pinned WebLLM runtime`);
}

console.log("iOS local AI static tests passed");
