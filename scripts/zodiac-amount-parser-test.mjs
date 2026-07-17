import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const appPath = new URL("../app.js", import.meta.url);
const source = fs.readFileSync(appPath, "utf8");
const marker = "window.FortuneApp = {";
const parserSource = `${source.slice(0, source.indexOf(marker))}\nglobalThis.__parseInputText = parseInputText;\n})();`;

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
vm.runInContext(parserSource, sandbox, { filename: "app.js" });

const parse = (text) => sandbox.__parseInputText(text, "澳门", "特码");
const total = (orders) => orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

const zodiacPackages = parse("龙虎牛狗各20");
assert.equal(zodiacPackages.length, 4);
assert.ok(zodiacPackages.every((order) => order.type === "特码"));
assert.ok(zodiacPackages.every((order) => order.packageTotal === true));
assert.equal(total(zodiacPackages), 80);
assert.equal(zodiacPackages.flatMap((order) => order.targets).length, 16);

for (const text of ["龙虎牛狗各数20", "龙虎牛狗各号20"]) {
  const perNumber = parse(text);
  assert.equal(perNumber.length, 1, text);
  assert.equal(perNumber[0].type, "特码", text);
  assert.notEqual(perNumber[0].packageTotal, true, text);
  assert.equal(perNumber[0].targets.length, 16, text);
  assert.equal(perNumber[0].amount, 20, text);
  assert.equal(total(perNumber), 320, text);
}

const specialSnake = parse("特蛇100");
assert.equal(specialSnake.length, 1);
assert.equal(specialSnake[0].type, "特码");
assert.equal(specialSnake[0].packageTotal, true);
assert.equal(specialSnake[0].targets.length, 4);
assert.equal(specialSnake[0].total, 100);
assert.equal(specialSnake[0].amount / specialSnake[0].targets.length, 25);

const flatSnake = parse("平蛇100");
assert.equal(flatSnake.length, 1);
assert.equal(flatSnake[0].type, "一肖");
assert.equal(flatSnake[0].total, 100);

const suffixFlatZodiacs = parse("蛇平 虎平各20");
assert.equal(suffixFlatZodiacs.length, 1);
assert.equal(suffixFlatZodiacs[0].type, "一肖");
assert.deepEqual(Array.from(suffixFlatZodiacs[0].targets), ["虎", "蛇"]);
assert.equal(suffixFlatZodiacs[0].amount, 20);
assert.equal(suffixFlatZodiacs[0].total, 40);

console.log("zodiac amount parser tests passed");
