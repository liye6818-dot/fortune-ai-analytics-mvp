import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const path = new URL("../app.js", import.meta.url);
const source = fs.readFileSync(path, "utf8");
const marker = "window.FortuneApp = {";
const parserSource = `${source.slice(0, source.indexOf(marker))}\nglobalThis.__parseInputText = parseInputText; globalThis.__normalizeLearningText = normalizeLearningText;\n})();`;
const storage = new Map();
const sandbox = {
  window: { APP_CONFIG: {} },
  location: { protocol: "https:" },
  document: { getElementById: () => null },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  navigator: { userAgent: "test", language: "zh-CN", platform: "test" },
  screen: { width: 390, height: 844 },
  crypto: globalThis.crypto,
  Intl,
  console,
  setTimeout,
  clearTimeout,
  fetch: async () => { throw new Error("network disabled in parser test"); }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(parserSource, sandbox, { filename: String(path) });

const parse = (text) => JSON.parse(JSON.stringify(sandbox.__parseInputText(text, "澳门", "特码")));
const only = (text) => {
  const result = parse(text);
  assert.equal(result.length, 1, `${text} should produce one order`);
  return result[0];
};

for (const text of ["鸡兔猴各号10", "鸡兔猴号10"]) {
  const order = only(text);
  assert.ok(order.targets.length > 0);
  assert.equal(order.amount, 10);
}

for (const text of ["06 08 各号5", "06 08 号5", "06号 08号 各5"]) {
  const order = only(text);
  assert.deepEqual(order.targets, ["06", "08"]);
  assert.equal(order.amount, 5);
}

const bigNumberOrder = only("大号10");
assert.equal(bigNumberOrder.amount, 10);
assert.equal(bigNumberOrder.targets.length, 25);
assert.equal(bigNumberOrder.targets[0], "25");

assert.equal(sandbox.__normalizeLearningText("鸡兔猴各号10"), "鸡兔猴各数10");
assert.equal(sandbox.__normalizeLearningText("鸡兔猴号10"), "鸡兔猴各10");

console.log("号/各号 parser regression passed");
