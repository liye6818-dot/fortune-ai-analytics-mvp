(() => {
const RISK_SETTINGS_KEY = "fortune_ai_analytics_mvp_risk_settings";
const CUSTOMER_KEY = "fortune_ai_analytics_mvp_customers";
const ORDER_STORAGE_KEY = "fortune_ai_analytics_mvp_orders";
const ADJUST_STORAGE_KEY = "fortune_ai_analytics_mvp_adjustments";
const REPORTED_STORAGE_KEY = "fortune_ai_analytics_mvp_reported";
const REPORT_PENDING_KEY = "fortune_ai_analytics_mvp_report_pending_confirmation";
const LEGACY_LICENSE_SESSION_KEY = "fortune_ai_analytics_mvp_license";
const OLD_LICENSE_SESSION_KEY = "fortune_ai_analytics_mvp_standalone_license_v2";
const LICENSE_SESSION_KEY = "fortune_ai_analytics_mvp_access_code_v3";
const DEVICE_KEY = "fortune_ai_analytics_mvp_device";
const DATA_BACKUP_KEY = "fortune_ai_analytics_mvp_backup";
const AI_EXAMPLES_KEY = "fortune_ai_analytics_mvp_ai_examples_v1";
const SETTLEMENT_MANUAL_KEY = "fortune_source_item_settlement_manual_v2";
const LEARNING_SETTINGS_KEY = "fortune_parser_learning_settings_single_v1";
const LEARNING_CASES_KEY = "fortune_parser_learning_cases_single_v1";
const LEARNING_RULES_KEY = "fortune_parser_learning_rules_single_v1";
const LEARNING_CONFLICTS_KEY = "fortune_parser_learning_conflicts_single_v1";
const LEARNING_REMOTE_SETTINGS_KEY = "fortune_parser_learning_remote_settings_single_v1";
const LEARNING_REMOTE_PACKAGE_KEY = "fortune_parser_learning_remote_package_single_v1";
const DEFAULT_LEARNING_PACKAGE_URL = "https://caishenye88.com/parser-learning/test.json";
const LOCAL_TEST_BYPASS_LICENSE = false;
const APP_CONFIG = window.APP_CONFIG || {};
const MACAU_DRAW_API = APP_CONFIG.MACAU_DRAW_API || "";
const HONGKONG_DRAW_API = APP_CONFIG.HONGKONG_DRAW_API || "";
const CORS_PROXY = APP_CONFIG.CORS_PROXY || "";
const TESSERACT_SCRIPT_URL = APP_CONFIG.TESSERACT_SCRIPT_URL || "";
const LOCAL_AI_BASE_URL = APP_CONFIG.LOCAL_AI_BASE_URL || "";
const LOCAL_AI_MODEL = APP_CONFIG.LOCAL_AI_MODEL || "";
const WEBLLM_MODULE_URL = APP_CONFIG.WEBLLM_MODULE_URL || "";
const WEBLLM_MODEL = APP_CONFIG.WEBLLM_MODEL || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const WEBLLM_READY_KEY = `fortune_webllm_ready_${WEBLLM_MODEL}`;
const IOS_AI_TEST_KEY = "fortune_ios_ai_private_test_v1";
const API_BASE_URL = String(APP_CONFIG.API_BASE_URL || (location.protocol === "file:" ? "http://127.0.0.1:3000" : "")).replace(/\/+$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function normalizeAccessCode(code) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

const zodiacOrder = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const currentYearZodiac = "马";
const red = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46]);
const blue = new Set([3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48]);
const green = new Set([5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]);
const defaultOdds = {
  "特码": 47,
  "一肖": 12,
  "主肖": 10,
  "特肖": 12,
  "平肖": 12,
  "二连肖无主": 1,
  "二连肖带主": 1,
  "三连肖无主": 1,
  "三连肖带主": 1,
  "四连肖无主": 1,
  "四连肖带主": 1,
  "五连肖无主": 1,
  "五连肖带主": 1,
  "连肖": 1,
  "平尾": 2.1,
  "0尾": 2.1,
  "二连尾": 1,
  "三连尾": 1,
  "四连尾": 1,
  "五连尾": 1,
  "二中二": 1,
  "三中三": 1,
  "特串": 1,
  "五不中": 1,
  "六不中": 1,
  "七不中": 1,
  "八不中": 1,
  "九不中": 1,
  "十不中": 1,
  "波色": 2.8,
  "半波": 5.6
};
const visiblePlayTypes = [
  "特码", "特肖", "一肖", "主肖", "平肖", "二连肖", "三连肖", "四连肖", "五连肖", "平尾", "二连尾", "三连尾", "四连尾", "五连尾",
  "五不中", "六不中", "七不中", "八不中", "九不中", "十不中",
  "二中二", "三中三", "特串", "波色", "半波"
];
const oddsSettingKeys = [
  "特码", "一肖", "主肖",
  "二连肖无主", "二连肖带主", "三连肖无主", "三连肖带主", "四连肖无主", "四连肖带主", "五连肖无主", "五连肖带主",
  "平尾", "0尾", "二连尾", "三连尾", "四连尾", "五连尾",
  "二中二", "三中三", "特串",
  "五不中", "六不中", "七不中", "八不中", "九不中", "十不中"
];
const deferredKeywords = [];
const eachAmountKeywords = "各数|每数|个数|各肖|每肖|各尾|每尾|各|每";
const groupedPlayTypes = new Set([
  "连肖", "二连肖", "三连肖", "四连肖", "五连肖", "二连尾", "三连尾", "四连尾", "五连尾",
  "五不中", "六不中", "七不中", "八不中", "九不中", "十不中",
  "二中二", "三中三", "特串"
]);

let orders = loadJson(ORDER_STORAGE_KEY, []);
let parsed = [];
let deferredLines = [];
let adjustments = loadJson(ADJUST_STORAGE_KEY, {});
let reported = loadJson(REPORTED_STORAGE_KEY, {});
let riskSettings = normalizeRiskSettings(loadJson(RISK_SETTINGS_KEY, { limitByRegion: { 澳门: 0, 香港: 0 } }));
let customers = loadJson(CUSTOMER_KEY, [{ id: "default", name: "散客", odds: 47, oddsByType: { ...defaultOdds }, rebateByType: {}, rebate: 0 }]);
let settlementManual = loadJson(SETTLEMENT_MANUAL_KEY, {});
let accessSession = null;
let heartbeatTimer = null;
let reportCopySnapshot = loadJson(REPORT_PENDING_KEY, null);
let reportReminderArmed = false;
let learningSnapshot = null;
let learningAppliedCaseId = null;
let learningLastDecision = {
  hit: false,
  caseId: null,
  matchType: "none",
  score: 0,
  finalSource: "original_parser",
  reason: "not_checked",
  normalizedText: ""
};

const $ = (id) => document.getElementById(id);

function on(id, eventName, handler) {
  const node = $(id);
  if (node) node.addEventListener(eventName, handler);
}

function setClick(id, handler) {
  const node = $(id);
  if (node) node.onclick = handler;
}

function runSafe(task) {
  try {
    task();
  } catch (error) {
    console.error(error);
  }
}

function simpleHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function deviceCode() {
  let code = safeStorageGet(DEVICE_KEY);
  if (!code) {
    const timezone = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "";
    const source = [navigator.userAgent, navigator.language, navigator.platform, screen.width, screen.height, timezone].join("|");
    code = `DEV-${simpleHash(source)}-${simpleHash(source.split("").reverse().join(""))}`;
    safeStorageSet(DEVICE_KEY, code);
  }
  return code;
}

async function validateStandaloneKey(key) {
  const response = await fetch(apiUrl("/api/auth/standalone-key"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      key,
      deviceId: deviceCode(),
      deviceInfo: navigator.userAgent
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.error === "standalone_key_bound_to_other_device") {
      return { ok: false, message: "访问码状态异常，请联系管理员处理。" };
    }
    if (body.error === "standalone_key_disabled") return { ok: false, message: "访问码已失效，请联系管理员处理。" };
    if (body.error === "standalone_key_expired") return { ok: false, message: "访问码已失效，请联系管理员处理。" };
    return { ok: false, message: "访问码无效，请检查后重试。" };
  }
  return { ok: true, expires: body.item?.expiresAt ? new Date(body.item.expiresAt) : null };
}

async function validateSecurityCode(code) {
  const response = await fetch(apiUrl("/api/auth/security-code"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      deviceId: deviceCode(),
      deviceInfo: navigator.userAgent
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: "访问码无效，请检查后重试。" };
  return {
    ok: true,
    expires: body.securityCode?.expiresAt ? new Date(body.securityCode.expiresAt) : null,
    session: { token: body.token, csrfToken: body.csrfToken }
  };
}

async function validateAccessCode(code) {
  const normalized = normalizeAccessCode(code);
  if (!normalized.startsWith("CJY-DJ-")) {
    return { ok: false, message: "单机版仅支持 CJY-DJ 单机访问码。" };
  }
  return validateStandaloneKey(normalized);
}

function setAppLocked(locked) {
  document.body.classList.toggle("locked", locked);
  $("licenseGate").hidden = !locked;
}

function clearAccessCache() {
  localStorage.removeItem(LEGACY_LICENSE_SESSION_KEY);
  sessionStorage.removeItem(LEGACY_LICENSE_SESSION_KEY);
  localStorage.removeItem(OLD_LICENSE_SESSION_KEY);
  sessionStorage.removeItem(OLD_LICENSE_SESSION_KEY);
  localStorage.removeItem(LICENSE_SESSION_KEY);
  sessionStorage.removeItem(LICENSE_SESSION_KEY);
}

function lockFromServer() {
  accessSession = null;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  clearAccessCache();
  $("licenseMessage").textContent = "访问码已下线，请重新进入。";
  setAppLocked(true);
}

async function sendHeartbeat() {
  if (!accessSession?.token) return;
  const response = await fetch(apiUrl("/api/session/heartbeat"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessSession.token}`,
      "x-csrf-token": accessSession.csrfToken || ""
    },
    body: JSON.stringify({ deviceInfo: navigator.userAgent })
  }).catch(() => null);
  if (!response) return;
  if (!response.ok) lockFromServer();
}

function startHeartbeat(session) {
  accessSession = session || null;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (!accessSession?.token) return;
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 30000);
}

function unlockApp(key, expires, session = null) {
  safeStorageSet(LICENSE_SESSION_KEY, JSON.stringify({
    key: normalizeAccessCode(key),
    expiresAt: expires ? new Date(expires).toISOString() : null,
    validatedAt: new Date().toISOString()
  }));
  setAppLocked(false);
  $("lastSaved").textContent = expires ? `授权到期 ${expires.toLocaleDateString()}` : "已授权";
  startHeartbeat(session);
}

async function activateLicense() {
  const key = normalizeAccessCode($("licenseInput").value);
  $("licenseInput").value = key;
  $("licenseMessage").textContent = "正在验证访问码...";
  let result;
  try {
    result = await validateAccessCode(key);
  } catch {
    result = null;
  }
  if (!result) result = { ok: false, message: "无法连接访问服务，请稍后重试。" };
  if (!result.ok) {
    $("licenseMessage").textContent = result.message;
    return;
  }
  unlockApp(key, result.expires, result.session);
}

function initLicenseGate() {
  if (LOCAL_TEST_BYPASS_LICENSE) {
    setAppLocked(false);
    accessSession = null;
    if ($("lastSaved")) $("lastSaved").textContent = "本地测试免访问码";
    return;
  }
  const remember = $("rememberLicense");
  if (remember) {
    remember.checked = true;
    remember.closest("label")?.setAttribute("hidden", "");
  }
  $("activateBtn").addEventListener("click", activateLicense);
  $("licenseInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") activateLicense();
  });
  let cached = null;
  try { cached = JSON.parse(safeStorageGet(LICENSE_SESSION_KEY) || "null"); } catch { cached = null; }
  const expiresAt = cached?.expiresAt ? new Date(cached.expiresAt) : null;
  const validatedAt = cached?.validatedAt ? new Date(cached.validatedAt) : null;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const cacheValid = cached?.key && (!expiresAt || expiresAt > new Date()) && validatedAt && Date.now() - validatedAt.getTime() <= sevenDays;
  if (!cacheValid) {
    clearAccessCache();
    setAppLocked(true);
    return;
  }
  setAppLocked(false);
  $("lastSaved").textContent = expiresAt ? `授权到期 ${expiresAt.toLocaleDateString()}` : "离线授权有效";
  if (navigator.onLine) {
    validateAccessCode(cached.key).then((result) => {
      if (result?.ok) unlockApp(cached.key, result.expires, result.session);
      else lockFromServer();
    }).catch(() => {});
  }
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function money(n) {
  return Number(n || 0).toFixed(2).replace(/\.00$/, "");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeId() {
  return "ord_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function loadJson(key, fallback) {
  try {
    const direct = safeStorageGet(key);
    if (direct) return JSON.parse(direct) ?? fallback;
    const backup = loadBackupValue(key);
    if (backup !== undefined) {
      safeStorageSet(key, JSON.stringify(backup));
      return backup;
    }
    return fallback;
  } catch {
    const backup = loadBackupValue(key);
    return backup !== undefined ? backup : fallback;
  }
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be blocked in private mode; keep the page usable.
  }
}

function loadBackupValue(key) {
  try {
    const backup = JSON.parse(safeStorageGet(DATA_BACKUP_KEY) || "{}");
    return Object.prototype.hasOwnProperty.call(backup, key) ? backup[key] : undefined;
  } catch {
    return undefined;
  }
}

function saveDataBackup() {
  safeStorageSet(DATA_BACKUP_KEY, JSON.stringify({
    [ORDER_STORAGE_KEY]: orders,
    [ADJUST_STORAGE_KEY]: adjustments,
    [REPORTED_STORAGE_KEY]: reported,
    [RISK_SETTINGS_KEY]: riskSettings,
    [CUSTOMER_KEY]: customers,
    [SETTLEMENT_MANUAL_KEY]: settlementManual,
    [AI_EXAMPLES_KEY]: loadAiExamples(),
    savedAt: new Date().toISOString()
  }));
}

function normalizeRiskSettings(settings) {
  const legacyLimit = Number(settings?.limit || 0);
  return {
    ...(settings || {}),
    limitByRegion: {
      澳门: Number(settings?.limitByRegion?.澳门 ?? legacyLimit ?? 0),
      香港: Number(settings?.limitByRegion?.香港 ?? legacyLimit ?? 0)
    },
    reportOddsByRegion: {
      澳门: Number(settings?.reportOddsByRegion?.澳门 ?? 47),
      香港: Number(settings?.reportOddsByRegion?.香港 ?? 47)
    },
    reportRebateByRegion: {
      澳门: Number(settings?.reportRebateByRegion?.澳门 ?? 0),
      香港: Number(settings?.reportRebateByRegion?.香港 ?? 0)
    }
  };
}

function riskLimitForRegion(region) {
  return Number(riskSettings.limitByRegion?.[region] || 0);
}

function setRiskLimitForRegion(region, limit) {
  riskSettings.limitByRegion = { ...(riskSettings.limitByRegion || {}), [region]: Number(limit || 0) };
  safeStorageSet(RISK_SETTINGS_KEY, JSON.stringify(riskSettings));
  saveDataBackup();
}

function reportOddsForRegion(region) {
  return Number(riskSettings.reportOddsByRegion?.[region] ?? 47);
}

function reportRebateForRegion(region) {
  return Math.max(0, Number(riskSettings.reportRebateByRegion?.[region] ?? 0));
}

function setReportSettingsForRegion(region, odds, rebate) {
  riskSettings.reportOddsByRegion = { ...(riskSettings.reportOddsByRegion || {}), [region]: Number(odds || 47) };
  riskSettings.reportRebateByRegion = { ...(riskSettings.reportRebateByRegion || {}), [region]: Math.max(0, Number(rebate || 0)) };
  safeStorageSet(RISK_SETTINGS_KEY, JSON.stringify(riskSettings));
  saveDataBackup();
}

function applyReportSettingsToControls(region) {
  if ($("adjustOdds")) $("adjustOdds").value = money(reportOddsForRegion(region));
  if ($("adjustRebate")) $("adjustRebate").value = String(reportRebateForRegion(region));
}

function normalizeCustomer(customer) {
  const normalized = customer || {};
  normalized.id = normalized.id || "default";
  normalized.name = normalized.name || "散客";
  normalized.odds = Number(normalized.odds || defaultOdds["特码"] || 47);
  normalized.oddsByType = { ...defaultOdds, ...(normalized.oddsByType || {}), "特码": Number(normalized.oddsByType?.["特码"] || normalized.odds || defaultOdds["特码"]) };
  normalized.rebateByType = { ...(normalized.rebateByType || {}) };
  normalized.rebate = Number(normalized.rebate || 0);
  return normalized;
}

function orderOddsKey(order) {
  if (typeof order === "string") return order;
  const type = order?.type;
  const targets = Array.isArray(order?.targets) ? order.targets : [];
  if (type === "主肖") return "主肖";
  if (type === "特肖" || type === "平肖" || type === "一肖") return targets.includes(currentYearZodiac) ? "主肖" : "一肖";
  if (isZodiacComboType(type)) {
    const count = Math.min(5, Math.max(2, targets.length));
    const playName = type === "连肖" ? `${["", "", "二", "三", "四", "五"][count]}连肖` : type;
    return `${playName}${targets.includes(currentYearZodiac) ? "带主" : "无主"}`;
  }
  if (type === "平尾") return targets.includes("0") ? "0尾" : "平尾";
  return type || "特码";
}

function customerOdds(customer, orderOrType) {
  const normalized = normalizeCustomer(customer);
  const key = orderOddsKey(orderOrType);
  return Number(normalized.oddsByType?.[key] || defaultOdds[key] || normalized.odds || 1);
}

function customerRebate(customer, orderOrType) {
  const normalized = normalizeCustomer(customer);
  const key = orderOddsKey(orderOrType);
  return Number(normalized.rebateByType?.[key] ?? normalized.rebate ?? 0);
}

function currentCustomer() {
  const id = $("entryCustomer")?.value || customers[0]?.id || "default";
  return normalizeCustomer(customers.find((customer) => customer.id === id) || customers[0]);
}

function customerById(id) {
  return normalizeCustomer(customers.find((customer) => customer.id === id) || customers[0]);
}

const reservedCustomerNames = new Set(["上报", "已上报", "未上报", "待上报", "刚刚", "全部", "已提交", "未提交"]);

function compactText(value) {
  return String(value || "").replace(/[\s:：,，.。;；、\-_/\\|()[\]{}<>《》【】"'“”‘’]/g, "").toLowerCase();
}

function sanitizeCustomers(list) {
  const seen = new Set();
  const source = Array.isArray(list) ? list : [];
  const items = [];
  let changed = false;
  for (const item of source) {
    const customer = normalizeCustomer({ ...item });
    const name = String(customer.name || "").trim();
    const key = compactText(name);
    if (!name || reservedCustomerNames.has(name) || seen.has(key)) {
      changed = true;
      continue;
    }
    seen.add(key);
    items.push(customer);
  }
  if (!items.length || !items.some((customer) => customer.id === "default")) {
    items.unshift(normalizeCustomer({ id: "default", name: "散客", odds: 47, oddsByType: { ...defaultOdds }, rebateByType: {}, rebate: 0 }));
    changed = true;
  }
  return { items, changed };
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCustomerInText(text) {
  const compact = compactText(text);
  return customers
    .filter((customer) => customer?.name)
    .sort((a, b) => String(b.name).length - String(a.name).length)
    .find((customer) => {
      const name = compactText(customer.name);
      if (!name) return false;
      if (name.length >= 2) return compact.includes(name);
      return new RegExp(`(^|[^\\u4e00-\\u9fa5A-Za-z0-9])${escapeRegExp(customer.name)}(?=$|[^\\u4e00-\\u9fa5A-Za-z0-9]|香|港|澳|\\d)`, "i").test(String(text || ""));
    }) || null;
}

function removeCustomerNameFromText(text, customer) {
  if (!customer?.name) return text;
  return String(text || "").replace(new RegExp(escapeRegExp(customer.name), "gi"), " ");
}

function parseInputContext(text) {
  const detectedCustomer = findCustomerInText(text);
  const region = detectRegion(text, $("defaultRegion").value);
  const customer = detectedCustomer ? normalizeCustomer(detectedCustomer) : currentCustomer();
  return {
    customer,
    region,
    text: removeCustomerNameFromText(text, detectedCustomer)
  };
}

function applyParseContextToControls(context) {
  if (context.customer?.id && $("entryCustomer")) $("entryCustomer").value = context.customer.id;
  if (context.region && $("defaultRegion")) $("defaultRegion").value = context.region;
}

function orderTotalUnits(order) {
  if (order?.packageTotal) return 1;
  return groupedPlayTypes.has(order?.type) ? 1 : (order?.targets?.length || 0);
}

function updateOrderTotal(order) {
  order.total = Number(order.amount || 0) * orderTotalUnits(order);
}

function targetStakeAmount(order) {
  if (groupedPlayTypes.has(order?.type)) return Number(order?.amount || 0);
  const targetCount = (order?.targets || []).length;
  if (targetCount) return Number(order?.total || 0) / targetCount;
  return Number(order.amount || 0);
}

function payoutAmount(order) {
  if (order?.packageTotal && order.targets?.length) return Number(order.amount || 0) / order.targets.length;
  return Number(order.amount || 0);
}

function rebateAmountFor(total, rebate) {
  return Number(total || 0) * Number(rebate || 0);
}

function isZodiacComboType(type) {
  return type === "连肖" || /^[二三四五]连肖$/.test(String(type || ""));
}

function zodiacComboSize(type) {
  return ({ "二连肖": 2, "三连肖": 3, "四连肖": 4, "五连肖": 5 })[type] || 0;
}

function combinations(items, size) {
  if (size <= 0 || items.length < size) return [];
  if (size === 1) return items.map((item) => [item]);
  const result = [];
  items.forEach((item, index) => {
    combinations(items.slice(index + 1), size - 1).forEach((tail) => {
      result.push([item, ...tail]);
    });
  });
  return result;
}

function expandZodiacComboOrder(order) {
  const size = zodiacComboSize(order?.type);
  if (!size) return [order];
  if (!String(order.raw || "").includes("复式")) return [order];
  const zodiacTargets = uniqueTargets((order.targets || []).filter((target) => zodiacOrder.includes(String(target))));
  if (zodiacTargets.length <= size) {
    order.targets = zodiacTargets;
    updateOrderTotal(order);
    order.warnings = validateParsedOrder(order);
    return [order];
  }
  return combinations(zodiacTargets, size).map((targets, index) => {
    const expanded = {
      ...order,
      id: index === 0 ? order.id : makeId(),
      raw: `${order.raw}（拆分${index + 1}）`,
      targets,
      hint: `已按${order.type}拆分`
    };
    updateOrderTotal(expanded);
    expanded.warnings = validateParsedOrder(expanded);
    return expanded;
  });
}

function expandMainZodiacSingles(order) {
  if (!["特肖", "平肖", "一肖"].includes(order?.type)) return [order];
  const targets = uniqueTargets((order.targets || []).filter((target) => zodiacOrder.includes(String(target))));
  if (!targets.includes(currentYearZodiac)) return [order];
  const otherTargets = targets.filter((target) => target !== currentYearZodiac);
  const mainOrder = {
    ...order,
    id: otherTargets.length ? makeId() : order.id,
    type: "主肖",
    targets: [currentYearZodiac],
    hint: "主肖已独立套用赔率返水"
  };
  updateOrderTotal(mainOrder);
  if (!otherTargets.length) return [mainOrder];
  const otherOrder = {
    ...order,
    targets: otherTargets,
    hint: "已拆出主肖"
  };
  updateOrderTotal(otherOrder);
  return [otherOrder, mainOrder];
}

function applyCustomerDefaults(order, customer = currentCustomer()) {
  order.customerId = customer.id;
  order.customerName = customer.name;
  order.rebate = customerRebate(customer, order);
  order.odds = customerOdds(customer, order);
  updateOrderTotal(order);
  order.warnings = validateParsedOrder(order);
  return order;
}

function renderCustomers() {
  const select = $("entryCustomer");
  if (!select) return;
  const current = select.value || customers[0]?.id;
  select.innerHTML = customers.map((customer) => `<option value="${customer.id}">${htmlEscape(customer.name)}</option>`).join("");
  select.value = customers.some((customer) => customer.id === current) ? current : customers[0]?.id || "";
  renderCustomerSettings();
}

function addCustomer() {
  const name = $("customerNameInput").value.trim();
  if (!name) {
    alert("请先填写客户名称。");
    return;
  }
  const existing = customers.find((customer) => customer.name === name);
  const customer = existing || {
    id: "cus_" + Date.now().toString(36),
    name,
    odds: defaultOdds["特码"],
    oddsByType: { ...defaultOdds },
    rebateByType: {},
    rebate: 0
  };
  customer.oddsByType = { ...defaultOdds, ...(customer.oddsByType || {}) };
  customer.rebateByType = { ...(customer.rebateByType || {}) };
  customer.odds = Number(customer.oddsByType["特码"] || defaultOdds["特码"]);
  if (!existing) customers.push(customer);
  saveAll();
  renderCustomers();
  renderCustomerSettings();
  $("entryCustomer").value = customer.id;
  $("settingsCustomer").value = customer.id;
  $("customerNameInput").value = "";
}

function renderCustomerSettings() {
  const select = $("settingsCustomer");
  if (!select) return;
  const current = select.value || $("entryCustomer")?.value || customers[0]?.id;
  select.innerHTML = customers.map((customer) => `<option value="${customer.id}">${htmlEscape(customer.name)}</option>`).join("");
  select.value = customers.some((customer) => customer.id === current) ? current : customers[0]?.id || "";
  const customer = customerById(select.value);
  $("customerOddsGrid").innerHTML = oddsSettingKeys.map((type) => `
    <div class="odds-setting-row">
      <b>${type}</b>
      <label>赔率
        <input class="customer-odds-input" data-type="${type}" type="number" min="0" step="0.01" value="${money(customerOdds(customer, type))}" />
      </label>
      <label>返水
        <input class="customer-rebate-input" data-type="${type}" type="number" min="0" step="0.01" value="${money(customerRebate(customer, type))}" />
      </label>
    </div>
  `).join("");
}

function saveCustomerSettings() {
  const customer = customers.find((item) => item.id === $("settingsCustomer").value);
  if (!customer) return;
  customer.oddsByType = { ...defaultOdds, ...(customer.oddsByType || {}) };
  customer.rebateByType = { ...(customer.rebateByType || {}) };
  $("customerOddsGrid").querySelectorAll(".customer-odds-input").forEach((input) => {
    customer.oddsByType[input.dataset.type] = Number(input.value || 0);
  });
  $("customerOddsGrid").querySelectorAll(".customer-rebate-input").forEach((input) => {
    customer.rebateByType[input.dataset.type] = Number(input.value || 0);
  });
  customer.odds = Number(customer.oddsByType["特码"] || defaultOdds["特码"]);
  customer.rebate = Number(customer.rebateByType["特码"] || 0);
  saveAll();
  renderCustomers();
  $("entryCustomer").value = customer.id;
  renderCustomerSettings();
  parseOrders();
  $("customerSettingsStatus").textContent = `已保存 ${customer.name}`;
}

function saveAll() {
  safeStorageSet(ORDER_STORAGE_KEY, JSON.stringify(orders));
  safeStorageSet(ADJUST_STORAGE_KEY, JSON.stringify(adjustments));
  safeStorageSet(REPORTED_STORAGE_KEY, JSON.stringify(reported));
  safeStorageSet(RISK_SETTINGS_KEY, JSON.stringify(riskSettings));
  safeStorageSet(CUSTOMER_KEY, JSON.stringify(customers));
  safeStorageSet(SETTLEMENT_MANUAL_KEY, JSON.stringify(settlementManual));
  saveDataBackup();
  $("lastSaved").textContent = "注单仅本机保存";
}

function normalizeText(text) {
  return String(text || "")
    .replace(/免/g, "兔")
    .replace(/两连/g, "二连")
    .replace(/([=＝/／?？]\s*)([零一二两三四五六七八九十百千]+)/g, (_, separator, amount) => `${separator}${chineseAmountToNumber(amount) ?? amount}`)
    .replace(/[，、；;·]/g, " ")
    .replace(/[：:]/g, " ")
    .replace(/(?<=\d)\.(?=\d)/g, " ")
    .replace(/[。]/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function chineseAmountToNumber(input) {
  if (!input) return null;
  const text = String(input).trim();
  const number = Number(text);
  if (!Number.isNaN(number)) return number;
  const digit = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text.endsWith("千")) return (digit[text[0]] || 1) * 1000;
  if (text.includes("千")) {
    const [a, b] = text.split("千");
    return (digit[a] || 1) * 1000 + (b ? chineseAmountToNumber(b) : 0);
  }
  if (text === "十") return 10;
  if (text.endsWith("百")) return (digit[text[0]] || 1) * 100;
  if (text.includes("百")) {
    const [a, b] = text.split("百");
    return (digit[a] || 1) * 100 + (b ? chineseAmountToNumber(b) : 0);
  }
  if (text.includes("十")) {
    const [a, b] = text.split("十");
    return (a ? digit[a] : 1) * 10 + (b ? digit[b] : 0);
  }
  return digit[text] ?? null;
}

function numberMeta(num) {
  const n = Number(num);
  const currentIndex = zodiacOrder.indexOf(currentYearZodiac);
  const zodiacIndex = (currentIndex - ((n - 1) % 12) + 12) % 12;
  return {
    number: n,
    label: pad(n),
    zodiac: zodiacOrder[zodiacIndex],
    tail: n % 10,
    color: red.has(n) ? "红波" : blue.has(n) ? "蓝波" : "绿波",
    size: n >= 25 ? "大" : "小",
    oddEven: n % 2 ? "单" : "双"
  };
}

function numbersForZodiac(zodiac) {
  return Array.from({ length: 49 }, (_, i) => i + 1).filter((n) => numberMeta(n).zodiac === zodiac);
}

function paddedNumbersForZodiac(zodiac) {
  return numbersForZodiac(zodiac).map(pad);
}

function numbersForWave(colorName) {
  const source = colorName === "红" ? red : colorName === "蓝" ? blue : green;
  return [...source].sort((a, b) => a - b);
}

function waveTargets(text) {
  const normalized = String(text || "");
  const targets = [];
  ["红", "蓝", "绿"].forEach((color) => {
    const waveNumbers = numbersForWave(color);
    if (new RegExp(`${color}\\s*波`).test(normalized)) {
      targets.push(...waveNumbers.map(pad));
    }
    ["单", "双", "大", "小"].forEach((kind) => {
      if (!new RegExp(`${color}\\s*${kind}`).test(normalized)) return;
      targets.push(...waveNumbers
        .filter((n) => {
          if (kind === "单") return n % 2 === 1;
          if (kind === "双") return n % 2 === 0;
          if (kind === "大") return n >= 25;
          return n <= 24;
        })
        .map(pad));
    });
  });
  return uniqueTargets(targets);
}

function extractNumbers(line) {
  return [...String(line || "").matchAll(/\b([0-4]?\d)\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 49)
    .map(pad);
}

function uniqueTargets(targets) {
  return [...new Set(targets)];
}

function zodiacMatches(text) {
  return zodiacOrder.filter((z) => text.includes(z));
}

function zodiacList(text) {
  return (String(text || "").match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || []);
}

function tailMatches(text) {
  return [...String(text || "").matchAll(/([0-9])\s*尾/g)].map((m) => String(Number(m[1])));
}

function numbersForTail(tail) {
  const normalized = Number(tail);
  return Array.from({ length: 49 }, (_, i) => i + 1)
    .filter((n) => n % 10 === normalized)
    .map(pad);
}

function numbersForHead(head) {
  const normalized = Number(head);
  const start = normalized === 0 ? 1 : normalized * 10;
  const end = normalized === 0 ? 9 : Math.min(normalized * 10 + 9, 49);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => pad(start + i));
}

function specialNumberGroupTargets(text) {
  const source = String(text || "");
  const targets = [];
  const hasSpecialPrefix = /特/.test(source);
  if (/(?:特)?小数|(?:特)?小号|(?:特)?小码/.test(source) && !/[单双]/.test(source)) targets.push(...Array.from({ length: 24 }, (_, i) => i + 1).map(pad));
  else if (/(?:特)?大数|(?:特)?大号|(?:特)?大码/.test(source) && !/[单双]/.test(source)) targets.push(...Array.from({ length: 25 }, (_, i) => i + 25).map(pad));
  else if (/小/.test(source) && /双/.test(source)) targets.push(...Array.from({ length: 24 }, (_, i) => i + 1).filter((n) => n % 2 === 0).map(pad));
  else if (/小/.test(source) && /单/.test(source)) targets.push(...Array.from({ length: 24 }, (_, i) => i + 1).filter((n) => n % 2 === 1).map(pad));
  else if (/大/.test(source) && /双/.test(source)) targets.push(...Array.from({ length: 25 }, (_, i) => i + 25).filter((n) => n % 2 === 0).map(pad));
  else if (/大/.test(source) && /单/.test(source)) targets.push(...Array.from({ length: 25 }, (_, i) => i + 25).filter((n) => n % 2 === 1).map(pad));
  for (const match of source.matchAll(/(?:特)?([0-4])\s*头/g)) targets.push(...numbersForHead(match[1]));
  for (const match of source.matchAll(/特?([0-9])\s*尾/g)) {
    if (hasSpecialPrefix || !/平\s*[0-9]\s*尾|平尾|连尾/.test(source)) targets.push(...numbersForTail(match[1]));
  }
  return uniqueTargets(targets);
}

function detectRegion(line, fallback) {
  if (/香|港|香港/.test(line)) return "香港";
  if (/澳|澳门/.test(line)) return "澳门";
  return fallback;
}

function isDeferredLine(line) {
  return deferredKeywords.some((keyword) => String(line || "").includes(keyword));
}

function detectType(line, fallbackType = "特码") {
  const zodiacs = zodiacMatches(line);
  if (/二连肖|二连/.test(line) && zodiacs.length) return "二连肖";
  if (/三连肖|三连/.test(line) && zodiacs.length) return "三连肖";
  if (/四连肖|四连/.test(line) && zodiacs.length) return "四连肖";
  if (/五连肖|五连/.test(line) && zodiacs.length) return "五连肖";
  if (/连肖/.test(line) && zodiacs.length) return `${["", "", "二", "三", "四", "五"][Math.min(5, Math.max(2, zodiacs.length))]}连肖`;
  if (/[二两]连尾/.test(line)) return "二连尾";
  if (/三连尾/.test(line)) return "三连尾";
  if (/四连尾/.test(line)) return "四连尾";
  if (/五连尾/.test(line)) return "五连尾";
  if (/五不中|5不中/.test(line)) return "五不中";
  if (/六不中|6不中/.test(line)) return "六不中";
  if (/七不中|7不中/.test(line)) return "七不中";
  if (/八不中|8不中/.test(line)) return "八不中";
  if (/九不中|9不中/.test(line)) return "九不中";
  if (/十不中|10不中/.test(line)) return "十不中";
  if (/二中二|2\s*中\s*2|对碰/.test(line)) return "二中二";
  if (/三中三|3中3/.test(line)) return "三中三";
  if (/特串/.test(line)) return "特串";
  if (isDeferredLine(line)) return "暂不解析";
  if (/特肖|特.*肖/.test(line)) return "特肖";
  if (/主肖/.test(line)) return "主肖";
  if (/一肖/.test(line) || (zodiacs.length && /平/.test(line))) return "一肖";
  if (/平\s*[0-9]\s*尾|平尾/.test(line)) return "平尾";
  if (/特?[0-4]\s*头|特?[0-9]\s*尾|特?[大小单双]/.test(line)) return "特码";
  if (/半波|红波|蓝波|绿波|波色|红大|红小|蓝大|蓝小|绿大|绿小|红单|蓝单|绿单|红双|蓝双|绿双/.test(line)) return "特码";
  return fallbackType || "特码";
}

function detectAmount(line) {
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const unit = "\\s*[.。．、,，]?\\s*(?:元|米|块|斤)?";
  const amountSeparator = "[.。．、,，\\s]*[=＝/／?？]+[.。．、,，\\s]*";
  const patterns = [
    new RegExp(`(?:${eachAmountKeywords})\\s*${amount}${unit}`),
    new RegExp(`${amountSeparator}${amount}${unit}\\s*$`),
    new RegExp(`${amount}${unit}\\s*(?:[一二三四五六七八九十0-9]+段)?\\s*$`),
    new RegExp(`\\s${amount}$`)
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return chineseAmountToNumber(match[1]);
  }
  return null;
}

function stripAmountText(line) {
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const unit = "\\s*[.。．、,，]?\\s*(?:元|米|块|斤)?";
  const amountSeparator = "[.。．、,，\\s]*[=＝/／?？]+[.。．、,，\\s]*";
  const text = String(line || "");
  const separatedAmountPattern = new RegExp(`${amountSeparator}${amount}${unit}\\s*$`, "g");
  const markedAmountPattern = new RegExp(`(?:${eachAmountKeywords})\\s*${amount}${unit}`, "g");
  if (separatedAmountPattern.test(text) || markedAmountPattern.test(text)) {
    return text
      .replace(markedAmountPattern, " ")
      .replace(separatedAmountPattern, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return text
    .replace(new RegExp(`${amount}${unit}\\s*(?:[一二三四五六七八九十0-9]+段)?\\s*$`, "g"), " ")
    .replace(/\s+[0-9]+(?:\.[0-9]+)?$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitAmountText(line) {
  return new RegExp(`[=＝/／?？]|${eachAmountKeywords}|元|米|块|斤`).test(String(line || ""));
}

function hasEachAmountText(line) {
  return new RegExp(`${eachAmountKeywords}|个`).test(String(line || ""));
}

function detectLooseTrailingAmount(line) {
  const cleaned = normalizeText(line)
    .replace(/澳门|香港|澳|港/g, " ")
    .replace(/[一二三四五六七八九十0-9]+段/g, " ")
    .trim();
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?|[一二两三四五六七八九十百]+)\s*[.。．、,，]?\s*(?:元|米|块|斤)?$/);
  return match ? chineseAmountToNumber(match[1]) : null;
}

function stripLooseTrailingAmount(line) {
  return normalizeText(line)
    .replace(/([0-9]+(?:\.[0-9]+)?|[一二两三四五六七八九十百]+)\s*[.。．、,，]?\s*(?:元|米|块|斤)?\s*(?:澳门|香港|澳|港)?\s*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTargets(type, text) {
  const targetText = stripAmountText(text);
  const specialGroup = type === "特码" ? specialNumberGroupTargets(targetText) : [];
  if (specialGroup.length) return specialGroup;
  const wave = waveTargets(targetText);
  if (wave.length) return wave;
  const numbers = extractNumbers(targetText);
  const zodiacs = zodiacMatches(targetText);
  const tails = tailMatches(targetText);
  if (type === "特码" && zodiacs.length) return uniqueTargets(zodiacs.flatMap(paddedNumbersForZodiac));
  if (isZodiacComboType(type)) return zodiacList(targetText);
  if (type === "特肖" || type === "平肖" || type === "一肖" || type === "主肖") return zodiacs;
  if (type === "平尾" || /连尾$/.test(type)) return tails.length ? tails : numbers.map((n) => String(Number(n) % 10));
  if (/不中$/.test(type) || type === "二中二" || type === "三中三" || type === "特串") return numbers;
  if (type === "波色") return ["红波", "蓝波", "绿波"].filter((v) => targetText.includes(v) || targetText.includes(v[0]));
  if (type === "半波") {
    return ["红大", "红小", "红单", "红双", "蓝大", "蓝小", "蓝单", "蓝双", "绿大", "绿小", "绿单", "绿双"]
      .filter((v) => targetText.includes(v));
  }
  return numbers;
}

function normalizeManualTargets(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[\s,，、;；-]+/);
  return list
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((item) => {
      const n = Number(item);
      if (!Number.isNaN(n) && n >= 1 && n <= 49) return pad(n);
      return item;
    });
}

function normalizeTargetsForType(type, value) {
  if (type === "平尾" || /连尾$/.test(type || "")) {
    const list = Array.isArray(value) ? value : String(value || "").split(/[\s,，、;；-]+/);
    return uniqueTargets(list
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((item) => {
        const match = item.match(/([0-9])\s*尾?$/);
        return match ? String(Number(match[1])) : item;
      }));
  }
  return normalizeManualTargets(value);
}

function validateParsedOrder(order) {
  const warnings = [];
  if (!Number(order.amount)) warnings.push("缺少金额");
  if (!order.targets?.length) warnings.push("缺少内容");
  const comboSize = zodiacComboSize(order.type);
  if (comboSize) {
    const zodiacTargets = (order.targets || []).filter((target) => zodiacOrder.includes(String(target)));
    if (new Set(zodiacTargets).size !== zodiacTargets.length) warnings.push("生肖重复");
    if (zodiacTargets.length !== comboSize) warnings.push(`${order.type}需要${comboSize}个生肖`);
  }
  return warnings;
}

function makeOrder({ raw, region, type, targets, amount }) {
  const odds = defaultOdds[type] || 1;
  const normalizedTargets = normalizeTargetsForType(type, targets);
  const order = {
    id: makeId(),
    raw,
    region,
    type,
    targets: normalizedTargets,
    amount: Number(amount || 0),
    odds,
    rebate: 0,
    total: 0,
    status: "待开奖",
    profit: 0,
    winAmount: 0,
    createdAt: new Date().toISOString(),
    hint: "",
    warnings: []
  };
  updateOrderTotal(order);
  order.warnings = validateParsedOrder(order);
  return order;
}

function isNumberOnlyLine(line) {
  const withoutNumbers = String(line || "").replace(/\b[0-4]?\d\b/g, " ").replace(/[-\s/／+＋]+/g, "").trim();
  return extractNumbers(line).length > 0 && withoutNumbers === "";
}

function primaryNumberText(line) {
  const normalized = normalizeText(line);
  const positions = deferredKeywords.map((keyword) => normalized.indexOf(keyword)).filter((index) => index >= 0);
  if (!positions.length) return normalized;
  return normalized.slice(0, Math.min(...positions)).trim();
}

function splitMarkedSegments(line) {
  const normalized = normalizeText(line);
  const labels = [...normalized.matchAll(/[一二三四五六七八九十0-9]+段/g)];
  if (labels.length < 2) return [normalized];
  const segments = [];
  let start = 0;
  for (const label of labels) {
    const end = label.index + label[0].length;
    const segment = normalized.slice(start, end).trim();
    if (segment) segments.push(segment);
    start = end;
  }
  const remainder = normalized.slice(start).trim();
  if (remainder && segments.length) {
    segments[segments.length - 1] = `${segments[segments.length - 1]} ${remainder}`.trim();
  } else if (remainder) {
    segments.push(remainder);
  }
  return segments;
}

function splitEachAmountSegments(line) {
  const normalized = normalizeText(line);
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const trailingAmount = "(?:[0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const unit = "\\s*[.。．、,，]?\\s*(?:元|米|块|斤)?";
  const pattern = new RegExp(`.*?(?:${eachAmountKeywords})\\s*${amount}${unit}`, "g");
  const segments = [];
  let match;
  let lastIndex = 0;
  while ((match = pattern.exec(normalized)) !== null) {
    const segment = match[0].replace(/^[.。．·、,，/／+＋\s]+/, "").trim();
    if (segment) segments.push(segment);
    lastIndex = pattern.lastIndex;
  }
  const remainder = normalized.slice(lastIndex).replace(/^[.。．·、,，/／+＋\s]+/, "").trim();
  const pureTotalPattern = new RegExp(`^[=＝]\\s*${trailingAmount}${unit}$`);
  if (segments.length && remainder && !pureTotalPattern.test(remainder)) segments.push(remainder);
  return segments.length >= 2 ? segments : [normalized];
}

function deferredRemainder(line) {
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const trailingAmount = "(?:[0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const unit = "\\s*[.。．、,，]?\\s*(?:元|米|块|斤)?";
  const groupPattern = new RegExp(`((?:\\b[0-4]?\\d\\b[\\s.。．、,，\\-/／+＋]*)+)\\s*(?:各数|每数|个数|各|每)\\s*${amount}${unit}(?:\\s*[=＝]\\s*${trailingAmount}${unit})?`, "g");
  const remainder = normalizeText(line).replace(groupPattern, " ").replace(/\s+/g, " ").trim();
  return isDeferredLine(remainder) ? remainder : "";
}

function parseInlineNumberGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  const region = detectRegion(normalized, fallbackRegion);
  const groups = [];
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const trailingAmount = "(?:[0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const unit = "\\s*[.。．、,，]?\\s*(?:元|米|块|斤)?";
  const groupPattern = new RegExp(`((?:\\b[0-4]?\\d\\b[\\s.。．、,，\\-/／+＋]*)+)\\s*(?:各数|每数|个数|各|每)\\s*${amount}${unit}(?:\\s*[=＝]\\s*${trailingAmount}${unit})?`, "g");
  let match;
  while ((match = groupPattern.exec(normalized)) !== null) {
    const targets = extractNumbers(match[1]);
    const parsedAmount = chineseAmountToNumber(match[2]) || 0;
    if (!targets.length || !parsedAmount) continue;
    groups.push(makeOrder({
      raw: match[0].trim(),
      region,
      type: "特码",
      targets,
      amount: parsedAmount
    }));
  }
  return groups;
}

function parseNumberSlashAmountGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (new RegExp(eachAmountKeywords).test(normalized)) return [];
  const region = detectRegion(normalized, fallbackRegion);
  const type = detectType(normalized);
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const pairPattern = new RegExp(`\\b([0-4]?\\d)\\b\\s*[=＝/／?？]\\s*${amount}\\s*(?:元|米|块|斤)?`, "g");
  const groups = [];
  let match;
  while ((match = pairPattern.exec(normalized)) !== null) {
    const target = pad(match[1]);
    const parsedAmount = chineseAmountToNumber(match[2]) || 0;
    if (!parsedAmount) continue;
    groups.push(makeOrder({
      raw: match[0].trim(),
      region,
      type,
      targets: [target],
      amount: parsedAmount
    }));
  }
  return groups;
}

function parseSpecialGroupAmountGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  const region = detectRegion(normalized, fallbackRegion);
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const label = "(特?大数|特?小数|特?大号|特?小号|特?大码|特?小码|大单|大双|小单|小双)";
  const pattern = new RegExp(`${label}\\s*(?:[=＝/／?？]|各|每)?\\s*${amount}\\s*(?:元|米|块|斤)?`, "g");
  const groups = [];
  let match;
  while ((match = pattern.exec(normalized)) !== null) {
    const targets = specialNumberGroupTargets(match[1]);
    const parsedAmount = chineseAmountToNumber(match[2]) || 0;
    if (!targets.length || !parsedAmount) continue;
    groups.push(makeOrder({
      raw: match[0].trim(),
      region,
      type: "特码",
      targets,
      amount: parsedAmount
    }));
  }
  return groups;
}

function parseCommaAmountStream(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (!/[元米块斤]|各|每/.test(normalized)) return [];
  const region = detectRegion(normalized, fallbackRegion);
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const amountPattern = new RegExp(`((?:各数|每数|个数|每个|各|每)\\s*)?${amount}\\s*(?:元|米|块|斤)`, "g");
  const groups = [];
  let cursor = 0;
  let match;
  while ((match = amountPattern.exec(normalized)) !== null) {
    const source = normalized.slice(cursor, match.index);
    const parsedAmount = chineseAmountToNumber(match[2]) || 0;
    const specialTargets = specialNumberGroupTargets(source);
    const numbers = specialTargets.length ? specialTargets : extractNumbers(source);
    if (parsedAmount && numbers.length) {
      groups.push(makeOrder({
        raw: `${source} ${match[0]}`.trim(),
        region,
        type: "特码",
        targets: match[1] || specialTargets.length ? numbers : [numbers[numbers.length - 1]],
        amount: parsedAmount
      }));
    }
    cursor = amountPattern.lastIndex;
  }
  return groups.length >= 2 ? groups : [];
}

function isEditableDeferredLine(line) {
  return /连肖|[二三四五]连/.test(String(line || "")) && zodiacMatches(line).length > 0;
}

function hasPlayKeyword(line) {
  return /连肖|[二三四五]连|[二三四五]连尾|[五六七八九十]不中|[5-9]不中|10不中|二中二|2\s*中\s*2|对碰|拖|三中三|3中3|特串|特肖|平肖|平特|平[鼠牛虎兔龙蛇马羊猴鸡狗猪]|一肖|主肖|平尾|特?[0-4]\s*头|特?[0-9]\s*尾|特?[大小单双]|半波|波色|红波|蓝波|绿波/.test(String(line || ""));
}

function makeEditableDeferredOrder(line, fallbackRegion) {
  const normalized = normalizeText(line);
  const region = detectRegion(normalized, fallbackRegion);
  const zodiacs = zodiacMatches(normalized);
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized) || 0;
  const targetText = stripLooseTrailingAmount(stripAmountText(normalized));
  const type = zodiacs.length && /连肖|[二三四五]连/.test(normalized) ? detectType(normalized) : zodiacs.length ? "特肖" : "特码";
  const targets = zodiacs.length ? zodiacs : extractNumbers(targetText);
  return makeOrder({
    raw: normalized,
    region,
    type,
    targets,
    amount
  });
}

function parseGroupedPlayLine(line, fallbackRegion) {
  const normalized = normalizeText(line);
  const type = detectType(normalized);
  if (!groupedPlayTypes.has(type)) return null;
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized) || 0;
  return makeOrder({
    raw: normalized,
    region: detectRegion(normalized, fallbackRegion),
    type,
    targets: parseTargets(type, normalized),
    amount
  });
}

function makeKeywordOrder(line, fallbackRegion) {
  const region = detectRegion(line, fallbackRegion);
  const type = detectType(line);
  const amount = detectAmount(line) || detectLooseTrailingAmount(line);
  const targets = parseTargets(type, line);
  return makeOrder({ raw: line, region, type, targets, amount });
}

function parseFlatZodiacAmount(line, fallbackRegion) {
  const normalized = normalizeText(line);
  const zodiacs = zodiacMatches(normalized);
  if (!zodiacs.length) return null;
  let type = "";
  if (/主肖/.test(normalized)) type = "主肖";
  else if (/一肖/.test(normalized) || /平/.test(normalized)) type = "一肖";
  else if (/特肖/.test(normalized)) type = "特肖";
  if (!type) return null;
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized);
  if (!amount) return null;
  return makeOrder({
    raw: normalized,
    region: detectRegion(normalized, fallbackRegion),
    type,
    targets: zodiacs,
    amount
  });
}

function dragParts(line) {
  const targetText = stripLooseTrailingAmount(stripAmountText(normalizeText(line)));
  const parts = targetText.split(/拖|胆/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return {
    fixed: parts[0],
    drag: parts.slice(1).join(" ")
  };
}

function parseZodiacComboDragGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (!/拖|胆/.test(normalized)) return [];
  const type = detectType(normalized);
  const size = zodiacComboSize(type);
  if (!size) return [];
  const parts = dragParts(normalized);
  if (!parts) return [];
  const fixed = zodiacList(parts.fixed).slice(-Math.max(1, size - 1));
  const drags = zodiacList(parts.drag);
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized) || 0;
  if (fixed.length !== size - 1 || !drags.length) return [];
  return drags
    .filter((zodiac) => !fixed.includes(zodiac))
    .map((zodiac, index) => makeOrder({
      raw: `${type}${fixed.join("")}拖${zodiac} ${amount || ""}`.trim(),
      region: detectRegion(normalized, fallbackRegion),
      type,
      targets: [...fixed, zodiac],
      amount
    }))
    .map((order, index) => ({ ...order, hint: `胆拖拆分 ${index + 1}` }));
}

function dragTokenNumbers(text) {
  const source = String(text || "").replace(/二中二|2\s*中\s*2|对碰|[二三四五]连肖?|连肖/g, " ");
  const tokens = [];
  const tokenPattern = /([鼠牛虎兔龙蛇马羊猴鸡狗猪])|([0-9])\s*尾|(?:\b([0-4]?\d)\b)/g;
  let match;
  while ((match = tokenPattern.exec(source)) !== null) {
    if (match[1]) {
      tokens.push({ label: match[1], numbers: paddedNumbersForZodiac(match[1]) });
      continue;
    }
    if (match[2] !== undefined) {
      tokens.push({ label: `${Number(match[2])}尾`, numbers: numbersForTail(match[2]) });
      continue;
    }
    if (match[3] !== undefined) {
      const n = Number(match[3]);
      if (n >= 1 && n <= 49) tokens.push({ label: pad(n), numbers: [pad(n)] });
    }
  }
  return tokens;
}

function parseTwoHitDragGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (!/拖|胆|对碰|[/／]/.test(normalized)) return [];
  if (detectType(normalized) !== "二中二") return [];
  const targetText = stripLooseTrailingAmount(stripAmountText(normalized));
  const parts = /对碰/.test(normalized) && !/拖|胆/.test(normalized)
    ? targetText.split(/对碰/).map((part) => part.trim()).filter(Boolean)
    : (/[/／]/.test(normalized) && !/拖|胆/.test(normalized)
      ? targetText.split(/[/／]/).map((part) => part.trim()).filter(Boolean)
      : null);
  const fixedText = parts ? parts[0] : dragParts(normalized)?.fixed;
  const dragText = parts ? parts.slice(1).join(" ") : dragParts(normalized)?.drag;
  if (!fixedText || !dragText) return [];
  const fixedTokens = dragTokenNumbers(fixedText);
  const dragTokens = dragTokenNumbers(dragText);
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized) || 0;
  if (!fixedTokens.length || !dragTokens.length) return [];
  const orders = [];
  fixedTokens.forEach((fixed) => {
    dragTokens.forEach((drag) => {
      fixed.numbers.forEach((a) => {
        drag.numbers.forEach((b) => {
          if (a === b) return;
          orders.push(makeOrder({
            raw: `二中二${fixed.label}拖${drag.label} ${amount || ""}`.trim(),
            region: detectRegion(normalized, fallbackRegion),
            type: "二中二",
            targets: [a, b],
            amount
          }));
        });
      });
    });
  });
  return orders.map((order, index) => ({ ...order, hint: `胆拖对碰 ${index + 1}` }));
}

function parseDragGroups(line, fallbackRegion) {
  return [
    ...parseZodiacComboDragGroups(line, fallbackRegion),
    ...parseTwoHitDragGroups(line, fallbackRegion)
  ];
}

function parseZodiacComboGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (normalized.includes("复式")) return [];
  if (!/[二三四五]连/.test(normalized)) return [];
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized);
  const targetText = stripLooseTrailingAmount(stripAmountText(normalized));
  const parts = [...targetText.matchAll(/([二三四五])连肖?|([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)/g)];
  const result = [];
  let currentType = "";
  for (const part of parts) {
    if (part[1]) {
      currentType = `${part[1]}连肖`;
      continue;
    }
    if (!currentType || !part[2]) continue;
    result.push(makeOrder({
      raw: `${currentType}${part[2]} ${amount || ""}`.trim(),
      region: detectRegion(normalized, fallbackRegion),
      type: currentType,
      targets: zodiacList(part[2]),
      amount
    }));
  }
  return result;
}

function parseMixedNumberZodiacTrailingAmount(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (hasPlayKeyword(normalized) || isDeferredLine(normalized)) return [];
  const amount = detectAmount(normalized) || detectLooseTrailingAmount(normalized);
  const numbers = extractNumbers(stripAmountText(normalized));
  const zodiacs = zodiacMatches(normalized);
  if (!amount || !numbers.length || !zodiacs.length) return [];
  const region = detectRegion(normalized, fallbackRegion);
  const orders = [
    makeOrder({
      raw: `${numbers.join(" ")} 各${amount}`,
      region,
      type: "特码",
      targets: numbers,
      amount
    })
  ];
  zodiacs.forEach((zodiac) => {
    const order = makeOrder({
      raw: `${zodiac} 各${amount}`,
      region,
      type: "特码",
      targets: paddedNumbersForZodiac(zodiac),
      amount
    });
    order.hint = `特码生肖，每号 ${money(order.amount)}`;
    orders.push(order);
  });
  return orders;
}

function parseZodiacEqualsAmountGroups(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (hasPlayKeyword(normalized) || isDeferredLine(normalized)) return [];
  const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百]+)";
  const unit = "\\s*[.。．、,，]?\\s*(?:元|米|块|斤)?";
  const pattern = new RegExp(`([鼠牛虎兔龙蛇马羊猴鸡狗猪])\\s*[=＝/／?？]+\\s*${amount}${unit}`, "g");
  const orders = [];
  let match;
  while ((match = pattern.exec(normalized)) !== null) {
    const parsedAmount = chineseAmountToNumber(match[2]) || 0;
    const order = makeOrder({
      raw: `${match[1]}=${parsedAmount}`,
      region: detectRegion(normalized, fallbackRegion),
      type: "特码",
      targets: paddedNumbersForZodiac(match[1]),
      amount: parsedAmount
    });
    order.packageTotal = true;
    updateOrderTotal(order);
    order.hint = `特码生肖总额，每号 ${money(Number(order.amount || 0) / order.targets.length)}`;
    orders.push(order);
  }
  return orders;
}

function parseZodiacNumberAmount(line, fallbackRegion) {
  const normalized = normalizeText(line);
  if (isDeferredLine(normalized)) return [];
  const region = detectRegion(normalized, fallbackRegion);
  const type = detectType(normalized);
  const amount = detectAmount(normalized);
  const zodiacs = zodiacMatches(normalized);
  if (!amount || !zodiacs.length) return [];
  if (type === "特肖" || type === "平肖" || type === "一肖" || type === "主肖" || isZodiacComboType(type)) {
    return [makeOrder({ raw: normalized, region, type, targets: zodiacs, amount })];
  }
  const order = makeOrder({
    raw: normalized,
    region,
    type: "特码",
    targets: uniqueTargets(zodiacs.flatMap(paddedNumbersForZodiac)),
    amount
  });
  if (!hasEachAmountText(normalized)) {
    order.packageTotal = true;
    updateOrderTotal(order);
    order.hint = `包肖总额，每号 ${money(Number(order.amount || 0) / order.targets.length)}`;
  }
  return [order];
}

function shouldKeepRowsAsSegments(lines) {
  const normalizedLines = lines.map(normalizeText).filter(Boolean);
  const numberLikeLines = normalizedLines.filter((line) => extractNumbers(primaryNumberText(line)).length);
  return normalizedLines.length >= 3 && numberLikeLines.length >= 3 && normalizedLines.some(hasExplicitAmountText);
}

function parseInputAsEditableSegments(lines, fallbackRegion) {
  const result = [];
  deferredLines = [];
  for (const rawLine of lines) {
    const line = normalizeText(rawLine);
    if (!line) continue;

    const dragGroups = parseDragGroups(line, fallbackRegion);
    if (dragGroups.length) {
      result.push(...dragGroups);
      continue;
    }

    const zodiacComboGroups = parseZodiacComboGroups(line, fallbackRegion);
    if (zodiacComboGroups.length) {
      result.push(...zodiacComboGroups);
      continue;
    }

    const flatZodiacOrder = parseFlatZodiacAmount(line, fallbackRegion);
    if (flatZodiacOrder) {
      result.push(flatZodiacOrder);
      continue;
    }

    const mixedNumberZodiacGroups = parseMixedNumberZodiacTrailingAmount(line, fallbackRegion);
    if (mixedNumberZodiacGroups.length) {
      result.push(...mixedNumberZodiacGroups);
      continue;
    }

    const zodiacEqualsGroups = parseZodiacEqualsAmountGroups(line, fallbackRegion);
    if (zodiacEqualsGroups.length) {
      result.push(...zodiacEqualsGroups);
      continue;
    }

    const specialGroupAmountGroups = parseSpecialGroupAmountGroups(line, fallbackRegion);
    if (specialGroupAmountGroups.length) {
      result.push(...specialGroupAmountGroups);
      continue;
    }

    const numberSlashAmountGroups = parseNumberSlashAmountGroups(line, fallbackRegion);
    if (numberSlashAmountGroups.length) {
      result.push(...numberSlashAmountGroups);
      continue;
    }

    const commaAmountGroups = parseCommaAmountStream(line, fallbackRegion);
    if (commaAmountGroups.length) {
      result.push(...commaAmountGroups);
      continue;
    }

    if (hasPlayKeyword(line)) {
      result.push(makeKeywordOrder(line, fallbackRegion));
      continue;
    }

    const groupedOrder = parseGroupedPlayLine(line, fallbackRegion);
    if (groupedOrder) {
      result.push(groupedOrder);
      continue;
    }

    const inlineGroups = parseInlineNumberGroups(line, fallbackRegion);
    if (inlineGroups.length) {
      result.push(...inlineGroups);
      const remainder = deferredRemainder(line);
      if (remainder) result.push(makeEditableDeferredOrder(remainder, fallbackRegion));
      continue;
    }

    if (isDeferredLine(line)) {
      result.push(makeEditableDeferredOrder(line, fallbackRegion));
      continue;
    }

    const explicitAmount = hasExplicitAmountText(line);
    const amount = explicitAmount ? detectAmount(line) : null;
    const region = detectRegion(line, fallbackRegion);
    const type = detectType(line);
    const targets = !explicitAmount && type === "特码" ? extractNumbers(line) : parseTargets(type, line);
    result.push(makeOrder({ raw: line, region, type, targets, amount }));
  }
  applyForwardAmountToPreviousSegments(result);
  return result;
}

function applyForwardAmountToPreviousSegments(ordersList) {
  let pending = [];
  for (const order of ordersList) {
    if (order.type !== "特码") {
      pending = [];
      continue;
    }
    if (!Number(order.amount)) {
      if (order.targets?.length) pending.push(order);
      continue;
    }
    if (pending.length) {
      pending.forEach((pendingOrder) => {
        pendingOrder.amount = order.amount;
        updateOrderTotal(pendingOrder);
        pendingOrder.warnings = validateParsedOrder(pendingOrder);
      });
      pending = [];
    }
  }
}

function parseInputText(text, fallbackRegion, fallbackType = "特码") {
  const result = [];
  deferredLines = [];
  let pendingNumberLines = [];
  const lines = String(text || "")
    .split(/\n+/)
    .flatMap((rawLine) => splitMarkedSegments(rawLine))
    .flatMap((rawLine) => splitEachAmountSegments(rawLine));
  if (shouldKeepRowsAsSegments(lines)) {
    return parseInputAsEditableSegments(lines, fallbackRegion);
  }
  for (const rawLine of lines) {
    const line = normalizeText(rawLine);
    if (!line) continue;

    const dragGroups = parseDragGroups(line, fallbackRegion);
    if (dragGroups.length) {
      pendingNumberLines = [];
      result.push(...dragGroups);
      continue;
    }

    const zodiacComboGroups = parseZodiacComboGroups(line, fallbackRegion);
    if (zodiacComboGroups.length) {
      pendingNumberLines = [];
      result.push(...zodiacComboGroups);
      continue;
    }

    const flatZodiacOrder = parseFlatZodiacAmount(line, fallbackRegion);
    if (flatZodiacOrder) {
      pendingNumberLines = [];
      result.push(flatZodiacOrder);
      continue;
    }

    const mixedNumberZodiacGroups = parseMixedNumberZodiacTrailingAmount(line, fallbackRegion);
    if (mixedNumberZodiacGroups.length) {
      pendingNumberLines = [];
      result.push(...mixedNumberZodiacGroups);
      continue;
    }

    const zodiacEqualsGroups = parseZodiacEqualsAmountGroups(line, fallbackRegion);
    if (zodiacEqualsGroups.length) {
      pendingNumberLines = [];
      result.push(...zodiacEqualsGroups);
      continue;
    }

    const specialGroupAmountGroups = parseSpecialGroupAmountGroups(line, fallbackRegion);
    if (specialGroupAmountGroups.length) {
      pendingNumberLines = [];
      result.push(...specialGroupAmountGroups);
      continue;
    }

    const numberSlashAmountGroups = parseNumberSlashAmountGroups(line, fallbackRegion);
    if (numberSlashAmountGroups.length) {
      pendingNumberLines = [];
      result.push(...numberSlashAmountGroups);
      continue;
    }

    const commaAmountGroups = parseCommaAmountStream(line, fallbackRegion);
    if (commaAmountGroups.length) {
      pendingNumberLines = [];
      result.push(...commaAmountGroups);
      continue;
    }

    if (hasPlayKeyword(line)) {
      pendingNumberLines = [];
      result.push(makeKeywordOrder(line, fallbackRegion));
      continue;
    }

    const groupedOrder = parseGroupedPlayLine(line, fallbackRegion);
    if (groupedOrder) {
      pendingNumberLines = [];
      result.push(groupedOrder);
      continue;
    }

    const zodiacGroups = parseZodiacNumberAmount(line, fallbackRegion);
    if (zodiacGroups.length) {
      pendingNumberLines = [];
      result.push(...zodiacGroups);
      continue;
    }

    const numberLine = primaryNumberText(line);
    const amount = detectAmount(numberLine);
    const numbers = extractNumbers(stripAmountText(numberLine));
    if (amount && pendingNumberLines.length) {
      const targets = [...pendingNumberLines, ...numbers];
      result.push(makeOrder({
        raw: targets.join(" ") + ` 各数 ${amount}`,
        region: detectRegion(line, fallbackRegion),
        type: "特码",
        targets,
        amount
      }));
      pendingNumberLines = [];
      const remainder = deferredRemainder(line);
      if (remainder && isEditableDeferredLine(remainder)) {
        result.push(makeEditableDeferredOrder(remainder, fallbackRegion));
      } else if (remainder) {
        deferredLines.push(remainder);
      }
      continue;
    }

    const inlineGroups = parseInlineNumberGroups(line, fallbackRegion);
    if (inlineGroups.length) {
      pendingNumberLines = [];
      result.push(...inlineGroups);
      const remainder = deferredRemainder(line);
      if (remainder && isEditableDeferredLine(remainder)) {
        result.push(makeEditableDeferredOrder(remainder, fallbackRegion));
      } else if (remainder) {
        deferredLines.push(remainder);
      }
      continue;
    }

    if (isNumberOnlyLine(line)) {
      pendingNumberLines.push(...extractNumbers(line));
      continue;
    }

    if (isDeferredLine(line)) {
      if (isEditableDeferredLine(line)) {
        result.push(makeEditableDeferredOrder(line, fallbackRegion));
        continue;
      }
      deferredLines.push(rawLine.trim());
      continue;
    }

    const region = detectRegion(line, fallbackRegion);
    const type = detectType(line, fallbackType);
    const targets = parseTargets(type, line);
    result.push(makeOrder({ raw: line, region, type, targets, amount }));
  }
  return result;
}

function refreshParsedOrder(index) {
  const order = parsed[index];
  if (!order) return;
  order.amount = Number(order.amount || 0);
  order.odds = Number(order.odds || defaultOdds[order.type] || 1);
  order.targets = normalizeTargetsForType(order.type, order.targets);
  updateOrderTotal(order);
  order.hint = order.packageTotal && order.targets.length ? `包肖总额，每号 ${money(Number(order.amount || 0) / order.targets.length)}` : "";
  order.warnings = validateParsedOrder(order);
}

function cleanSourceItemText(value) {
  return String(value || "")
    .replace(/（(?:人工拆分|人工新增|拆分\d+)）$/g, "")
    .trim();
}

function attachSourceItems(items, forceNew = false) {
  const sourceMap = new Map();
  const batchId = `src_${makeId()}`;
  let nextIndex = 1;
  return (items || []).map((order) => {
    if (order.sourceItemId && !forceNew) return order;
    const sourceText = cleanSourceItemText(order.sourceItemText || order.raw) || `人工项目${nextIndex}`;
    const key = forceNew && order.sourceItemId ? order.sourceItemId : (normalizeText(sourceText) || sourceText);
    if (!sourceMap.has(key)) {
      sourceMap.set(key, { id: `${batchId}_${nextIndex}`, index: nextIndex, text: sourceText });
      nextIndex += 1;
    }
    const source = sourceMap.get(key);
    return {
      ...order,
      sourceBatchId: batchId,
      sourceItemId: source.id,
      sourceItemIndex: source.index,
      sourceItemText: source.text
    };
  });
}

function parseOrders(learningSourceText = null) {
  const context = parseInputContext($("orderInput").value);
  const learningSource = typeof learningSourceText === "string" ? learningSourceText : $("orderInput").value;
  applyParseContextToControls(context);
  parsed = attachSourceItems(parseInputText(context.text, context.region, $("defaultType")?.value || "特码")
    .flatMap(expandZodiacComboOrder)
    .flatMap(expandMainZodiacSingles)
    .map((order) => applyCustomerDefaults(order, context.customer)));
  learningSnapshot = {
    sourceText: learningSource,
    originalResult: learningOrdersValue(parsed),
    createdAt: new Date().toISOString()
  };
  learningAppliedCaseId = null;
  learningLastDecision = {
    hit: false,
    caseId: null,
    matchType: "none",
    score: 0,
    finalSource: "original_parser",
    reason: learningSettings().enabled ? "no_match" : "learning_disabled",
    normalizedText: normalizeLearningText(learningSource)
  };
  parsed = applyMixedEachNumberRule(learningSource, parsed);
  if (!learningAppliedCaseId) parsed = applyEachNumberXRule(learningSource, parsed);
  if (!learningAppliedCaseId) parsed = applyZodiacGroupedLearningRule(learningSource, parsed);
  if (!learningAppliedCaseId) parsed = applyExactLearningCase(learningSource, parsed);
  if (!learningAppliedCaseId && learningLastDecision.caseId !== "builtin-each-number-x-v1") parsed = applyConfirmedAdditionRules(learningSource, parsed);
  parsed = attachSourceItems(parsed, Boolean(learningAppliedCaseId));
  renderParsed();
  renderDeferred();
  renderLearningEntryStatus();
}

function populateDefaultTypeSelect() {
  const select = $("defaultType");
  if (!select) return;
  const selected = select.value || "特码";
  select.innerHTML = visiblePlayTypes
    .map((type) => `<option value="${type}" ${type === selected ? "selected" : ""}>默认${type}</option>`)
    .join("");
}

function scheduleParseOrders() {
  clearTimeout(scheduleParseOrders.timer);
  scheduleParseOrders.timer = setTimeout(parseOrders, 120);
}

function setOcrStatus(text) {
  const status = $("ocrStatus");
  if (status) status.textContent = text || "";
}

function learningSettings() {
  return loadJson(LEARNING_SETTINGS_KEY, { enabled: false });
}

function learningCases() {
  const local = loadJson(LEARNING_CASES_KEY, []);
  const remote = loadJson(LEARNING_REMOTE_PACKAGE_KEY, null)?.cases || [];
  return [...local, ...remote.filter((remoteItem) => !local.some((localItem) => localItem.id === remoteItem.id))];
}

function learningRules() {
  const local = loadJson(LEARNING_RULES_KEY, []);
  const remote = loadJson(LEARNING_REMOTE_PACKAGE_KEY, null)?.rules || [];
  return [...local, ...remote.filter((remoteItem) => !local.some((localItem) => localItem.id === remoteItem.id))];
}

function localLearningCases() {
  return loadJson(LEARNING_CASES_KEY, []);
}

function localLearningRules() {
  return loadJson(LEARNING_RULES_KEY, []);
}

function learningConflicts() {
  return loadJson(LEARNING_CONFLICTS_KEY, []);
}

function saveLearningValue(key, value) {
  safeStorageSet(key, JSON.stringify(value));
}

function normalizeLearningText(value) {
  return String(value || "")
    .replace(/[Ⅹⅹ×＊*]/g, "x")
    .normalize("NFKC")
    .replace(/香港/g, "港")
    .replace(/澳门/g, "澳")
    .replace(/[，、；;]+/g, " ")
    .replace(/[.。．]+/g, " ")
    .replace(/(\d)\s*x\s*(?=\d)/gi, "$1各")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function learningNumberTokens(value) {
  return [...normalizeLearningExpression(value).matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

function learningTextPattern(value) {
  return normalizeLearningExpression(value).replace(/\d+(?:\.\d+)?/g, "{数字}");
}

function normalizeLearningExpression(value) {
  return normalizeLearningText(value)
    .replace(/(?:特码)?特单数?/g, "单数")
    .replace(/单个数|单数个/g, "单数各")
    .replace(/(\d+(?:\.\d+)?)\s*(?:元|块|米)?\s*(?:一个数|每个数|每数|各数|各号|各个)/g, "各$1")
    .replace(/(?:一个数|每个数|每数|各数|各号|各个|各)\s*(\d+(?:\.\d+)?)(?:\s*(?:元|块|米))?/g, "各$1")
    .replace(/单数各各/g, "单数各")
    .replace(/\s+/g, " ")
    .trim();
}

function learningSemanticSignature(value) {
  const text = normalizeLearningExpression(value);
  const groups = [
    ["单数", "双数"],
    ["大数", "小数", "大", "小"],
    ["特码", "平码"],
    ["澳门", "澳", "香港", "港"],
    ["红波", "蓝波", "绿波"],
    ["生肖", "尾数", "号码"]
  ];
  return groups.map((group) => group.find((word) => text.includes(word)) || "").join("|");
}

function learningEditDistance(left, right) {
  const a = [...String(left || "")];
  const b = [...String(right || "")];
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function fuzzyLearningCase(cases, sourceText) {
  const inputPattern = learningTextPattern(sourceText);
  const inputSignature = learningSemanticSignature(sourceText);
  const inputTokenCount = learningNumberTokens(sourceText).length;
  const ranked = cases
    .filter((item) => item.enabled !== false)
    .map((item) => {
      const template = effectiveLearningTemplate(item);
      const distance = learningEditDistance(template.pattern, inputPattern);
      const length = Math.max(template.pattern.length, inputPattern.length, 1);
      return { item, template, distance, similarity: 1 - distance / length };
    })
    .filter((candidate) => candidate.template.tokenCount === inputTokenCount)
    .filter((candidate) => learningSemanticSignature(candidate.item.sourceText) === inputSignature)
    .filter((candidate) => candidate.distance <= 1 || candidate.similarity >= 0.9)
    .sort((left, right) => left.distance - right.distance || right.similarity - left.similarity);
  if (!ranked.length) return null;
  if (ranked[1] && ranked[0].distance === ranked[1].distance && learningTemplateSignature(ranked[0].item) !== learningTemplateSignature(ranked[1].item)) return null;
  return ranked[0];
}

function numericTokenIndex(tokens, value, preferLast = false, startAt = 0, excluded = null) {
  const wanted = Number(value);
  const indexes = tokens.map((token, index) => index >= startAt && !excluded?.has(index) && Number(token) === wanted ? index : -1).filter((index) => index >= 0);
  if (!indexes.length) return -1;
  return preferLast ? indexes[indexes.length - 1] : indexes[0];
}

function buildLearningTemplate(sourceText, correctedResult) {
  const expression = normalizeLearningExpression(sourceText);
  const tokenMatches = [...expression.matchAll(/\d+(?:\.\d+)?/g)];
  const tokens = tokenMatches.map((match) => match[0]);
  const markedAmountIndexes = new Set(tokenMatches.map((match, index) => /各\s*$/.test(expression.slice(0, match.index)) ? index : -1).filter((index) => index >= 0));
  let tokenCursor = 0;
  return {
    templateVersion: 3,
    pattern: learningTextPattern(sourceText),
    tokenCount: tokens.length,
    orders: correctedResult.map((order) => {
      const targets = (order.targets || []).map((target) => {
        let index = /^\d+(?:\.\d+)?$/.test(String(target)) ? numericTokenIndex(tokens, target, false, tokenCursor, markedAmountIndexes) : -1;
        if (index < 0 && /^\d+(?:\.\d+)?$/.test(String(target))) index = numericTokenIndex(tokens, target, false, 0, markedAmountIndexes);
        if (index >= 0) tokenCursor = index + 1;
        return index >= 0 ? { tokenIndex: index, pad: String(target).length } : { value: target };
      });
      let amountTokenIndex = numericTokenIndex(tokens, order.amount, false, tokenCursor, new Set(tokens.map((_, index) => markedAmountIndexes.has(index) ? -1 : index).filter((index) => index >= 0)));
      if (amountTokenIndex < 0) amountTokenIndex = numericTokenIndex(tokens, order.amount, false, tokenCursor);
      if (amountTokenIndex < 0) amountTokenIndex = numericTokenIndex(tokens, order.amount, true);
      if (amountTokenIndex >= 0) tokenCursor = amountTokenIndex + 1;
      return {
        region: order.region,
        type: order.type,
        targets,
        amountTokenIndex,
        amountValue: Number(order.amount || 0),
        sourceItemId: order.sourceItemId || "",
        sourceItemIndex: Number(order.sourceItemIndex || 0),
        sourceItemText: order.sourceItemText || order.raw || sourceText
      };
    })
  };
}

function effectiveLearningTemplate(item) {
  if (item.template?.templateVersion === 3) return item.template;
  return buildLearningTemplate(item.sourceText, item.correctedResult || []);
}

function learningTemplateSignature(item) {
  const template = effectiveLearningTemplate(item);
  return JSON.stringify(template.orders.map((order) => ({
    region: order.region,
    type: order.type,
    targets: order.targets,
    amountTokenIndex: order.amountTokenIndex,
    amountValue: order.amountTokenIndex >= 0 ? "{数字}" : order.amountValue
  })));
}

function materializeLearningTemplate(item, sourceText, allowPatternMismatch = false) {
  const template = effectiveLearningTemplate(item);
  const tokens = learningNumberTokens(sourceText);
  if ((!allowPatternMismatch && template.pattern !== learningTextPattern(sourceText)) || template.tokenCount !== tokens.length) return null;
  const customer = currentCustomer();
  return template.orders.map((definition) => {
    const targets = definition.targets.map((target) => {
      if (target.tokenIndex == null) return target.value;
      const token = tokens[target.tokenIndex];
      if (token == null) return target.value || "";
      return target.pad > 1 ? String(Number(token)).padStart(target.pad, "0") : String(Number(token));
    });
    const amount = definition.amountTokenIndex >= 0 && tokens[definition.amountTokenIndex] != null
      ? Number(tokens[definition.amountTokenIndex])
      : Number(definition.amountValue || 0);
    return {
      ...applyCustomerDefaults(makeOrder({ raw: definition.sourceItemText || sourceText, region: definition.region, type: definition.type, targets, amount }), customer),
      sourceItemId: definition.sourceItemId || "",
      sourceItemIndex: Number(definition.sourceItemIndex || 0),
      sourceItemText: definition.sourceItemText || sourceText
    };
  });
}

function repeatedNumberAmountLearningMatch(cases, sourceText) {
  const pairPattern = "{数字}号{数字}";
  const inputPattern = learningTextPattern(sourceText);
  const inputParts = inputPattern.split(/\s+/).filter(Boolean);
  if (!inputParts.length || inputParts.some((part) => part !== pairPattern)) return null;
  const tokens = learningNumberTokens(sourceText);
  if (tokens.length !== inputParts.length * 2) return null;
  const candidates = cases.filter((item) => {
    if (item.enabled === false) return false;
    const template = effectiveLearningTemplate(item);
    const parts = template.pattern.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || parts.some((part) => part !== pairPattern)) return false;
    if (template.orders.length !== parts.length || template.tokenCount !== parts.length * 2) return false;
    return template.orders.every((order, index) => order.targets?.length === 1
      && order.targets[0]?.tokenIndex === index * 2
      && order.amountTokenIndex === index * 2 + 1);
  });
  if (!candidates.length) return null;
  const signatures = [...new Set(candidates.map((item) => {
    const first = effectiveLearningTemplate(item).orders[0];
    return JSON.stringify({ region: first.region, type: first.type, pad: first.targets[0]?.pad || 2 });
  }))];
  if (signatures.length !== 1) return null;
  const item = candidates.sort((left, right) => effectiveLearningTemplate(right).orders.length - effectiveLearningTemplate(left).orders.length)[0];
  const prototype = effectiveLearningTemplate(item).orders[0];
  const customer = currentCustomer();
  const orders = inputParts.map((_, index) => applyCustomerDefaults(makeOrder({
    raw: sourceText,
    region: prototype.region,
    type: prototype.type,
    targets: [String(Number(tokens[index * 2])).padStart(prototype.targets[0]?.pad || 2, "0")],
    amount: Number(tokens[index * 2 + 1])
  }), customer));
  return { item, orders };
}

function learningOrderValue(order) {
  return {
    region: order.region || "",
    type: order.type || "",
    targets: Array.isArray(order.targets) ? order.targets.map(String) : [],
    amount: Number(order.amount || 0),
    odds: Number(order.odds || 0),
    sourceItemId: order.sourceItemId || "",
    sourceItemIndex: Number(order.sourceItemIndex || 0),
    sourceItemText: order.sourceItemText || order.raw || ""
  };
}

function learningOrdersValue(items) {
  return (items || []).map(learningOrderValue);
}

function learningFingerprint(items) {
  return JSON.stringify(learningOrdersValue(items));
}

function learningStructuralFingerprint(items) {
  return JSON.stringify((items || []).map((order) => ({
    region: order.region || "",
    type: order.type || "",
    targets: Array.isArray(order.targets) ? order.targets.map(String) : [],
    amount: Number(order.amount || 0)
  })));
}

function learningChangedFields(before, after) {
  const fields = [];
  const length = Math.max(before.length, after.length);
  for (let index = 0; index < length; index += 1) {
    const left = before[index];
    const right = after[index];
    if (!left) { fields.push({ row: index, field: "row", change: "added" }); continue; }
    if (!right) { fields.push({ row: index, field: "row", change: "deleted" }); continue; }
    ["region", "type", "targets", "amount", "odds"].forEach((field) => {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        fields.push({ row: index, field, before: left[field], after: right[field] });
      }
    });
  }
  return fields;
}

function recordLearningConflict(kind, sourceText, detail) {
  const items = learningConflicts();
  items.unshift({ id: makeId(), kind, sourceText, detail, createdAt: new Date().toISOString(), resolved: false });
  saveLearningValue(LEARNING_CONFLICTS_KEY, items.slice(0, 200));
}

function persistLearningCaseUsage(item) {
  if (item.origin === "remote") {
    const packageValue = loadJson(LEARNING_REMOTE_PACKAGE_KEY, null);
    if (!packageValue) return;
    packageValue.cases = (packageValue.cases || []).map((entry) => entry.id === item.id ? item : entry);
    saveLearningValue(LEARNING_REMOTE_PACKAGE_KEY, packageValue);
    return;
  }
  saveLearningValue(LEARNING_CASES_KEY, [item, ...localLearningCases().filter((entry) => entry.id !== item.id)]);
}

function additionRuleCandidate(sourceText, changes, caseId) {
  const match = normalizeLearningText(sourceText).match(/([鼠牛虎兔龙蛇马羊猴鸡狗猪])\s*(再加|加|\+)\s*(\d+(?:\.\d+)?)/);
  if (!match || !changes.some((item) => item.field === "amount" || item.change === "deleted")) return null;
  return {
    id: makeId(),
    name: "对象 + 加/再加/+ + 金额 → 追加金额",
    kind: "append_amount",
    status: "pending",
    enabled: false,
    sourceCaseIds: [caseId],
    hitCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString()
  };
}

function saveLearningCase() {
  if (!learningSnapshot) return false;
  const corrected = learningOrdersValue(parsed);
  const detectedChanges = learningChangedFields(learningSnapshot.originalResult, corrected);
  const changes = detectedChanges.length ? detectedChanges : [{ row: 0, field: "example", change: "confirmed" }];
  const items = localLearningCases();
  const normalizedText = normalizeLearningText(learningSnapshot.sourceText);
  const pattern = learningTextPattern(learningSnapshot.sourceText);
  const existing = items.find((item) => item.normalizedText === normalizedText && item.enabled !== false)
    || items.find((item) => effectiveLearningTemplate(item).pattern === pattern && item.enabled !== false);
  const now = new Date().toISOString();
  const entry = {
    id: existing?.id || makeId(),
    sourceText: learningSnapshot.sourceText,
    normalizedText,
    originalResult: learningSnapshot.originalResult,
    correctedResult: corrected,
    changedFields: changes,
    template: buildLearningTemplate(learningSnapshot.sourceText, corrected),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    hitCount: existing?.hitCount || 0,
    lastUsedAt: existing?.lastUsedAt || null,
    enabled: true
  };
  const next = [entry, ...items.filter((item) => item.id !== entry.id && effectiveLearningTemplate(item).pattern !== pattern)];
  saveLearningValue(LEARNING_CASES_KEY, next.slice(0, 500));
  const rules = localLearningRules();
  const candidate = additionRuleCandidate(entry.sourceText, changes, entry.id);
  if (candidate) {
    const existingRule = rules.find((rule) => rule.kind === candidate.kind && rule.status === "pending");
    if (existingRule) {
      existingRule.sourceCaseIds = [...new Set([...(existingRule.sourceCaseIds || []), entry.id])];
      saveLearningValue(LEARNING_RULES_KEY, rules);
    } else {
      saveLearningValue(LEARNING_RULES_KEY, [candidate, ...rules]);
    }
  }
  return true;
}

function rememberCurrentCorrection() {
  const status = $("learningEntryStatus");
  if (!learningSettings().enabled) {
    if (status) status.textContent = "请先在解析学习库开启总开关";
    return;
  }
  if (!learningSnapshot || !parsed.length) {
    if (status) status.textContent = "请先输入并解析一张示例注单";
    return;
  }
  parsed.forEach((_, index) => refreshParsedOrder(index));
  if (parsed.some((order) => order.warnings?.length)) {
    if (status) status.textContent = "修正结果仍有错误提示，请先修改完整";
    return;
  }
  saveLearningCase();
  if ($("rememberCorrection")) $("rememberCorrection").checked = true;
  if (status) status.textContent = "已保存本次示范；现在可直接换金额测试，无需先入库";
}

function applyExactLearningCase(sourceText, baseline) {
  if (!learningSettings().enabled) {
    learningLastDecision.reason = "learning_disabled";
    return baseline;
  }
  const normalizedText = normalizeLearningText(sourceText);
  const cases = learningCases();
  const exact = cases.find((entry) => entry.enabled !== false && (entry.normalizedText === normalizedText || normalizeLearningText(entry.sourceText) === normalizedText));
  const patternMatches = cases.filter((entry) => entry.enabled !== false && effectiveLearningTemplate(entry).pattern === learningTextPattern(sourceText));
  const signatures = [...new Set(patternMatches.map(learningTemplateSignature))];
  const repeatedMatch = !exact && !patternMatches.length ? repeatedNumberAmountLearningMatch(cases, sourceText) : null;
  const fuzzyMatch = !exact && !patternMatches.length && !repeatedMatch ? fuzzyLearningCase(cases, sourceText) : null;
  const item = exact || (patternMatches.length && signatures.length === 1 ? patternMatches[0] : null) || repeatedMatch?.item || fuzzyMatch?.item;
  if (!item) {
    if (patternMatches.length > 1) {
      recordLearningConflict("multiple_template_matches", sourceText, { caseIds: patternMatches.map((entry) => entry.id) });
      learningLastDecision.reason = "multiple_template_matches";
    } else {
      learningLastDecision.reason = cases.length ? "no_matching_case" : "learning_library_empty";
    }
    return baseline;
  }
  const matchType = exact ? "exact" : repeatedMatch ? "repeated_template" : fuzzyMatch ? "fuzzy" : "template";
  const score = exact || !fuzzyMatch ? 1 : fuzzyMatch.similarity;
  if (exact && learningStructuralFingerprint(baseline) !== learningStructuralFingerprint(item.originalResult)) {
    recordLearningConflict("baseline_changed", sourceText, { caseId: item.id });
    learningLastDecision.reason = "exact_case_applied_baseline_changed";
  }
  if (!exact) {
    const materialized = repeatedMatch?.orders || materializeLearningTemplate(item, sourceText, Boolean(fuzzyMatch));
    if (!materialized?.length) {
      learningLastDecision.reason = "template_materialization_failed";
      return baseline;
    }
    item.hitCount = Number(item.hitCount || 0) + 1;
    item.templateHitCount = Number(item.templateHitCount || 0) + 1;
    if (fuzzyMatch) item.fuzzyHitCount = Number(item.fuzzyHitCount || 0) + 1;
    item.lastUsedAt = new Date().toISOString();
    persistLearningCaseUsage(item);
    learningAppliedCaseId = item.id;
    learningLastDecision = { ...learningLastDecision, hit: true, caseId: item.id, matchType, score, finalSource: "learning_case", reason: "applied" };
    return materialized;
  }
  const customer = currentCustomer();
  const learned = item.correctedResult.map((order) => applyCustomerDefaults(makeOrder({
    raw: order.sourceItemText || sourceText,
    region: order.region,
    type: order.type,
    targets: order.targets,
    amount: order.amount
  }), customer)).map((learnedOrder, index) => ({
    ...learnedOrder,
    sourceItemId: item.correctedResult[index]?.sourceItemId || "",
    sourceItemIndex: Number(item.correctedResult[index]?.sourceItemIndex || 0),
    sourceItemText: item.correctedResult[index]?.sourceItemText || sourceText
  }));
  learned.forEach((order) => {
    updateOrderTotal(order);
    order.warnings = validateParsedOrder(order);
  });
  item.hitCount = Number(item.hitCount || 0) + 1;
  item.lastUsedAt = new Date().toISOString();
  persistLearningCaseUsage(item);
  learningAppliedCaseId = item.id;
  learningLastDecision = {
    ...learningLastDecision,
    hit: true,
    caseId: item.id,
    matchType,
    score,
    finalSource: "learning_case",
    reason: learningLastDecision.reason === "exact_case_applied_baseline_changed" ? learningLastDecision.reason : "applied"
  };
  return learned;
}

function applyConfirmedAdditionRules(sourceText, baseline) {
  if (!learningSettings().enabled) return baseline;
  const rules = learningRules().filter((rule) => rule.kind === "append_amount" && rule.status === "confirmed" && rule.enabled);
  if (!rules.length) return baseline;
  const matches = [...String(sourceText || "").matchAll(/([鼠牛虎兔龙蛇马羊猴鸡狗猪])\s*(?:再加|加|\+)\s*(\d+(?:\.\d+)?)/g)];
  if (!matches.length) return baseline;
  const next = baseline.map((order) => ({ ...order, targets: [...(order.targets || [])], warnings: [...(order.warnings || [])] }));
  let applied = 0;
  matches.forEach((match) => {
    const zodiac = match[1];
    const amount = Number(match[2]);
    const candidates = next.filter((order) => order.targets?.includes(zodiac) && !String(order.raw || "").match(/再加|加|\+/));
    const additionRows = next.filter((order) => String(order.raw || "").includes(match[0]));
    if (candidates.length !== 1 || additionRows.length > 1) {
      recordLearningConflict("append_ambiguous", sourceText, { expression: match[0], candidateCount: candidates.length });
      return;
    }
    candidates[0].amount = Number(candidates[0].amount || 0) + amount;
    updateOrderTotal(candidates[0]);
    candidates[0].warnings = validateParsedOrder(candidates[0]);
    additionRows.forEach((row) => {
      const index = next.indexOf(row);
      if (index >= 0) next.splice(index, 1);
    });
    applied += 1;
  });
  if (applied) {
    const rule = rules[0];
    rule.hitCount = Number(rule.hitCount || 0) + applied;
    rule.lastUsedAt = new Date().toISOString();
    const allRules = localLearningRules().map((item) => item.id === rule.id ? rule : item);
    saveLearningValue(LEARNING_RULES_KEY, allRules);
    learningLastDecision = { ...learningLastDecision, hit: true, caseId: rule.id, matchType: "confirmed_rule", score: 1, finalSource: "confirmed_learning_rule", reason: "applied" };
  }
  return next;
}

function applyEachNumberXRule(sourceText, baseline) {
  if (!learningSettings().enabled) return baseline;
  const source = String(sourceText || "").replace(/[Ⅹⅹ×＊*]/g, "x");
  if (!/[xX]/.test(source)) return baseline;
  const number = "(?:0?[1-9]|[1-4][0-9])";
  const separator = "[ \\t.。．、,，\\-]+";
  const expression = new RegExp(`((?:${number})(?:${separator}${number})*)[\\s.。．、,，]*[xX]\\s*(\\d+)`, "g");
  const matches = [...source.matchAll(expression)];
  if (!matches.length) return baseline;
  const residue = source
    .replace(expression, " ")
    .replace(/澳门|香港|澳|港|特码|特码/g, " ")
    .replace(/[\s.。．、,，;；\-]+/g, "");
  if (residue) return baseline;
  const region = baseline[0]?.region || detectRegion(source, $("defaultRegion")?.value || "澳门");
  const type = baseline[0]?.type || $("defaultType")?.value || "特码";
  const customer = currentCustomer();
  const learned = matches.map((match) => {
    const targets = (match[1].match(/\d+/g) || [])
      .map((value) => Number(value))
      .filter((value) => value >= 1 && value <= 49)
      .map(pad);
    const order = applyCustomerDefaults(makeOrder({ raw: match[0], region, type, targets, amount: Number(match[2]) }), customer);
    updateOrderTotal(order);
    order.warnings = validateParsedOrder(order);
    return order;
  }).filter((order) => order.targets.length && order.amount > 0);
  if (!learned.length || learned.length !== matches.length) return baseline;
  learningAppliedCaseId = "builtin-each-number-x-v1";
  learningLastDecision = {
    ...learningLastDecision,
    hit: true,
    caseId: learningAppliedCaseId,
    matchType: "confirmed_rule",
    score: 1,
    finalSource: "confirmed_learning_rule",
    reason: "applied"
  };
  return learned;
}

function applyMixedEachNumberRule(sourceText, baseline) {
  if (!learningSettings().enabled) return baseline;
  const source = String(sourceText || "").replace(/[Ⅹⅹ×＊*]/g, "x");
  const zodiacExpression = /([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)\s*(?:各号|各数)\s*(\d+)/g;
  const number = "(?:0?[1-9]|[1-4][0-9])";
  const separator = "[ \\t.。．、,，\\-]+";
  const numberExpression = new RegExp(`((?:${number})(?:${separator}${number})*)[\\s.。．、,，]*[xX]\\s*(\\d+)`, "g");
  const zodiacMatches = [...source.matchAll(zodiacExpression)];
  const numberMatches = [...source.matchAll(numberExpression)];
  if (!zodiacMatches.length || !numberMatches.length) return baseline;
  const residue = source
    .replace(zodiacExpression, " ")
    .replace(numberExpression, " ")
    .replace(/[xX\s.。．、,，;；\-]+/g, "");
  if (residue) return baseline;
  const region = baseline[0]?.region || detectRegion(source, $("defaultRegion")?.value || "澳门");
  const customer = currentCustomer();
  const definitions = [
    ...zodiacMatches.map((match) => ({
      index: match.index,
      raw: match[0],
      type: "特码",
      targets: uniqueTargets((match[1].match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || []).flatMap(paddedNumbersForZodiac)),
      amount: Number(match[2])
    })),
    ...numberMatches.map((match) => ({
      index: match.index,
      raw: match[0],
      type: "特码",
      targets: (match[1].match(/\d+/g) || []).map((value) => pad(Number(value))),
      amount: Number(match[2])
    }))
  ].sort((left, right) => left.index - right.index);
  const learned = definitions.map((definition) => {
    const order = applyCustomerDefaults(makeOrder({ raw: definition.raw, region, type: definition.type, targets: definition.targets, amount: definition.amount }), customer);
    updateOrderTotal(order);
    order.warnings = validateParsedOrder(order);
    return order;
  });
  learningAppliedCaseId = "builtin-mixed-each-number-v1";
  learningLastDecision = {
    ...learningLastDecision,
    hit: true,
    caseId: learningAppliedCaseId,
    matchType: "confirmed_rule",
    score: 1,
    finalSource: "confirmed_learning_rule",
    reason: "applied"
  };
  return learned;
}

function applyZodiacGroupedLearningRule(sourceText, baseline) {
  if (!learningSettings().enabled) return baseline;
  const tokens = String(sourceText || "")
    .replace(/[，、；;]+/g, ",")
    .split(/[,\n]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const playType = (token) => {
    if (/^平特?一肖$/.test(token) || token === "平肖") return "平肖";
    if (token === "特肖" || token === "一肖" || /^[二三四五]连肖$/.test(token)) return token;
    return null;
  };
  const groups = [];
  let current = null;
  for (const token of tokens) {
    const type = playType(token);
    if (type) {
      if (current) return baseline;
      current = { type, targets: [] };
      continue;
    }
    if (!current) return baseline;
    const amountMatch = token.match(/^(\d+(?:\.\d+)?)\s*(?:元|块|米)?$/);
    if (amountMatch) {
      if (!current.targets.length) return baseline;
      groups.push({ ...current, amount: Number(amountMatch[1]) });
      current = null;
      continue;
    }
    const targets = token.match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || [];
    if (!targets.length || targets.join("") !== token.replace(/\s+/g, "")) return baseline;
    current.targets.push(...targets);
  }
  if (current || groups.length < 2) return baseline;
  const region = baseline[0]?.region || detectRegion(sourceText, $("defaultRegion")?.value || "澳门");
  const customer = currentCustomer();
  const learned = groups.map((group) => {
    const order = applyCustomerDefaults(makeOrder({ raw: sourceText, region, type: group.type, targets: uniqueTargets(group.targets), amount: group.amount }), customer);
    updateOrderTotal(order);
    order.warnings = validateParsedOrder(order);
    return order;
  });
  learningAppliedCaseId = "builtin-zodiac-grouped-v1";
  learningLastDecision = {
    ...learningLastDecision,
    hit: true,
    caseId: learningAppliedCaseId,
    matchType: "confirmed_rule",
    score: 1,
    finalSource: "confirmed_learning_rule",
    reason: "applied"
  };
  return learned;
}

let webLlmEnginePromise = null;

function browserAiSupported() {
  return location.protocol === "https:" && Boolean(navigator.gpu) && Boolean(WEBLLM_MODULE_URL);
}

function iosAiTestEnabled() {
  const mode = new URLSearchParams(location.search).get("iosai");
  if (mode === "enable") safeStorageSet(IOS_AI_TEST_KEY, "1");
  if (mode === "disable") localStorage.removeItem(IOS_AI_TEST_KEY);
  return safeStorageGet(IOS_AI_TEST_KEY) === "1";
}

function prefersBrowserAi() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && iosAiTestEnabled();
}

function setAiProgress(report = {}) {
  const progress = Number(report.progress || 0);
  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const text = String(report.text || "");
  const downloading = percent > 0 && percent < 100;
  setOcrStatus(downloading ? `手机AI模型下载中 ${percent}%` : (text || "手机AI正在启动..."));
  const button = $("aiParseBtn");
  if (button) {
    button.disabled = downloading;
    button.textContent = downloading ? `下载模型 ${percent}%` : "AI解析";
  }
}

async function browserAiEngine() {
  if (!browserAiSupported()) throw new Error("webgpu-unavailable");
  if (!webLlmEnginePromise) {
    const alreadyReady = safeStorageGet(WEBLLM_READY_KEY) === "1";
    if (!alreadyReady) {
      const accepted = window.confirm("首次使用需要通过 Wi-Fi 下载约 1GB 手机AI模型。下载后会保存在本机，可离线解析。现在下载吗？");
      if (!accepted) throw new Error("model-download-cancelled");
    }
    webLlmEnginePromise = (async () => {
      await navigator.storage?.persist?.().catch(() => false);
      const webllm = await import(WEBLLM_MODULE_URL);
      const appConfig = { ...webllm.prebuiltAppConfig, cacheBackend: "indexeddb" };
      const engine = await webllm.CreateMLCEngine(WEBLLM_MODEL, {
        appConfig,
        initProgressCallback: setAiProgress
      });
      safeStorageSet(WEBLLM_READY_KEY, "1");
      setAiProgress({ progress: 1, text: "手机AI已就绪" });
      return engine;
    })().catch((error) => {
      webLlmEnginePromise = null;
      const button = $("aiParseBtn");
      if (button) {
        button.disabled = false;
        button.textContent = "AI解析";
      }
      throw error;
    });
  }
  return webLlmEnginePromise;
}

async function callBrowserAi(prompt) {
  const engine = await browserAiEngine();
  setOcrStatus("手机AI正在整理...");
  const response = await engine.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 800
  });
  return String(response?.choices?.[0]?.message?.content || "").trim();
}

function localAiCandidates() {
  return ["http://127.0.0.1:11435", LOCAL_AI_BASE_URL || "http://127.0.0.1:11434"];
}

function isAllowedLocalAiUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && url.protocol === "http:";
  } catch {
    return false;
  }
}

function aiNormalizePrompt(text) {
  const examples = loadAiExamples().slice(0, 8);
  const exampleText = examples.length ? `\n请参考以下用户核对过的示例：\n${examples.map((item, index) => `示例${index + 1}原文：\n${item.raw}\n示例${index + 1}正确结果：\n${item.correct}`).join("\n\n")}\n` : "";
  return `把下面的六合彩下注内容整理成系统容易解析的纯文本。
只输出整理后的订单行，不要解释，不要 Markdown，不要 JSON。
保留区域、玩法、号码/生肖/尾数、金额。
每笔不同金额必须单独一行；“05=515 29=505”要拆成“澳门 特码 05 各数 515”和“澳门 特码 29 各数 505”，禁止把金额拼接或合并。
没有重复写区域或玩法时，沿用上一笔或界面默认值；玩法只能使用原文中的玩法或“特码”，不要输出“区域”等占位词。
可用格式示例：
澳门 特码 06 08 各数 50
香港 特肖 鼠牛 各肖 20
澳门 平尾 5尾 9尾 各 100
${exampleText}

原始内容：
${text}`;
}

function loadAiExamples() { try { const items=JSON.parse(safeStorageGet(AI_EXAMPLES_KEY)||"[]"); return Array.isArray(items)?items.filter((item)=>item?.raw&&item?.correct):[]; } catch { return []; } }
function mergeAiExamples(...groups) { return groups.flat().filter((item)=>item?.raw&&item?.correct).filter((item,index,items)=>items.findIndex((candidate)=>candidate.raw===item.raw&&candidate.correct===item.correct)===index).slice(0,50); }
async function syncAiExamplesWithBridge(items=loadAiExamples()) { try { const response=await fetch("http://127.0.0.1:11435/api/examples",{cache:"no-store"}); const remote=response.ok?(await response.json()).examples:[]; const merged=mergeAiExamples(items,remote); safeStorageSet(AI_EXAMPLES_KEY,JSON.stringify(merged)); await fetch("http://127.0.0.1:11435/api/examples",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({examples:merged})}); renderAiExamples(); return merged; } catch { return items; } }
function renderAiExamples() { const list=$("aiExamplesList"); if(!list)return; const items=loadAiExamples(); list.innerHTML=items.length?items.map((item,index)=>`<article class="ai-example-card"><div><b>原始乱单</b><pre>${htmlEscape(item.raw)}</pre></div><div><b>正确结果</b><pre>${htmlEscape(item.correct)}</pre></div><button class="plain danger-text" type="button" onclick="FortuneApp.deleteAiExample(${index})">删除</button></article>`).join(""):"<p>还没有示例。先保存一组乱单和正确结果。</p>"; }
function openAiExamplesDialog() { const dialog=$("aiExamplesDialog"); if(!dialog)return; renderAiExamples(); if(typeof dialog.showModal==="function")dialog.showModal(); else { dialog.setAttribute("open",""); dialog.classList.add("fallback-open"); } }
function closeAiExamplesDialog() { const dialog=$("aiExamplesDialog"); if(!dialog)return; if(typeof dialog.close==="function"&&dialog.open&&!dialog.classList.contains("fallback-open"))dialog.close(); else { dialog.classList.remove("fallback-open"); dialog.removeAttribute("open"); } }
function useCurrentInputAsExample() { $("aiExampleRaw").value=$("orderInput").value.trim(); $("aiExampleStatus").textContent="已带入当前输入，请填写并核对正确结果"; }
async function askLocalAi(prompt) {
  let lastError;
  if (prefersBrowserAi() && browserAiSupported()) {
    try { return cleanAiOrderText(await callBrowserAi(prompt)); } catch (error) {
      if (error?.message === "model-download-cancelled") throw error;
      lastError = error;
    }
  }
  for (const baseUrl of localAiCandidates()) {
    try {
      if (!isAllowedLocalAiUrl(baseUrl)) throw new Error("local-ai-url-only");
      return cleanAiOrderText(await callOllama(baseUrl, prompt));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("ai-unavailable");
}
async function previewAiExample() { const raw=$("aiExampleRaw").value.trim(); if(!raw){$("aiExampleStatus").textContent="请先粘贴原始乱单";return;} $("aiExampleStatus").textContent="AI正在解析..."; try{$("aiExampleCorrect").value=await askLocalAi(aiNormalizePrompt(raw));$("aiExampleStatus").textContent="请核对；不对就直接在下面告诉AI";}catch{$("aiExampleStatus").textContent="本机AI未连接，请确认 Ollama 已启动";} }
async function reviseAiExample() { const raw=$("aiExampleRaw").value.trim(),current=$("aiExampleCorrect").value.trim(),correction=$("aiExampleCorrection").value.trim(); if(!raw||!current||!correction){$("aiExampleStatus").textContent="需要原单、当前结果和纠正说明";return;} $("aiExampleStatus").textContent="AI正在按你的说法修改..."; const prompt=`你正在学习用户的六合彩录单习惯。只输出修改后的标准订单行，不要解释。\n原始乱单：\n${raw}\n\n当前解析结果：\n${current}\n\n用户纠正：\n${correction}`; try{$("aiExampleCorrect").value=await askLocalAi(prompt);$("aiExampleCorrection").value="";$("aiExampleStatus").textContent="已修改，请继续核对或确认正确并记住";}catch{$("aiExampleStatus").textContent="本机AI未连接，请确认 Ollama 已启动";} }
function saveAiExample() { const raw=$("aiExampleRaw").value.trim(); const correct=$("aiExampleCorrect").value.trim(); if(!raw||!correct){$("aiExampleStatus").textContent="原始乱单和正确结果都要填写";return;} const items=loadAiExamples(); items.unshift({raw,correct,savedAt:new Date().toISOString()}); safeStorageSet(AI_EXAMPLES_KEY,JSON.stringify(items.slice(0,50))); void syncAiExamplesWithBridge(items.slice(0,50)); saveDataBackup(); $("aiExampleRaw").value=""; $("aiExampleCorrect").value=""; $("aiExampleStatus").textContent=`已保存，共 ${Math.min(items.length,50)} 个示例`; renderAiExamples(); }
function deleteAiExample(index) { const items=loadAiExamples(); items.splice(index,1); safeStorageSet(AI_EXAMPLES_KEY,JSON.stringify(items)); void syncAiExamplesWithBridge(items); saveDataBackup(); renderAiExamples(); }
function exportAiExamples() { const data=JSON.stringify({format:"fortune-ai-examples-v1",examples:loadAiExamples(),exportedAt:new Date().toISOString()},null,2); const blob=new Blob([data],{type:"application/json;charset=utf-8"}); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=`fortune-ai-examples-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); $("aiExampleStatus").textContent=`已导出 ${loadAiExamples().length} 个示例`; }
async function importAiExamples(event) { const input=event?.target,file=input?.files?.[0]; if(!file)return; try { const data=JSON.parse(await file.text()),incoming=Array.isArray(data)?data:data?.examples; if(!Array.isArray(incoming))throw new Error("invalid-ai-examples"); const merged=mergeAiExamples(incoming,loadAiExamples()); safeStorageSet(AI_EXAMPLES_KEY,JSON.stringify(merged)); void syncAiExamplesWithBridge(merged); saveDataBackup(); renderAiExamples(); $("aiExampleStatus").textContent=`导入完成，现有 ${merged.length} 个示例`; } catch { $("aiExampleStatus").textContent="导入失败，请选择之前导出的 AI 示例文件"; } finally { input.value=""; } }

async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function firstOllamaModel(baseUrl) {
  if (LOCAL_AI_MODEL) return LOCAL_AI_MODEL;
  const response = await fetchWithTimeout(`${baseUrl}/api/tags`, { cache: "no-store" }, 4000);
  if (!response.ok) throw new Error("ollama-tags-failed");
  const data = await response.json();
  return data?.models?.[0]?.name || "";
}

async function callOllama(baseUrl, prompt) {
  const model = await firstOllamaModel(baseUrl);
  if (!model) throw new Error("ollama-model-missing");
  const response = await fetchWithTimeout(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.1 } })
  });
  if (!response.ok) throw new Error("ollama-generate-failed");
  const data = await response.json();
  return String(data?.response || "").trim();
}

function cleanAiOrderText(text) {
  return String(text || "")
    .replace(/```[\w-]*|```/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^整理后[:：]\s*/gm, "")
    .trim();
}

async function aiParseOrders() {
  if (location.protocol === "file:") {
    setOcrStatus("请用本地AI版地址打开，file页面会被 Ollama 拦截");
    return;
  }
  const input = $("orderInput");
  const raw = input.value.trim();
  if (!raw) {
    setOcrStatus("请先输入要解析的内容");
    return;
  }
  const context = parseInputContext(raw);
  applyParseContextToControls(context);
  const prompt = aiNormalizePrompt(raw);
  setOcrStatus("AI正在整理...");
  try {
    const cleaned = await askLocalAi(prompt);
    if (!cleaned) throw new Error("empty-ai-result");
    input.value = cleaned;
    resizeOrderInput();
    parseOrders(raw);
    setOcrStatus("AI已整理，请核对后入库");
  } catch (error) {
    console.warn(error);
    if (error?.message === "model-download-cancelled") setOcrStatus("已取消模型下载");
    else if (!browserAiSupported() && prefersBrowserAi()) setOcrStatus("当前Safari不支持手机本地AI，请升级iOS后重试");
    else setOcrStatus("手机AI启动失败，请检查网络和可用存储空间");
  } finally {
    const button = $("aiParseBtn");
    if (button) {
      button.disabled = false;
      button.textContent = "AI解析";
    }
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (window.Tesseract) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureTesseract() {
  if (window.Tesseract) return window.Tesseract;
  setOcrStatus("正在加载图片识别...");
  if (!TESSERACT_SCRIPT_URL) throw new Error("missing-ocr-script-url");
  await loadScript(TESSERACT_SCRIPT_URL);
  return window.Tesseract;
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/[|｜]/g, "1")
    .replace(/[Ｑ]/g, "0")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, "\"")
    .replace(/[﹣－—–]/g, "-")
    .replace(/[＝]/g, "=")
    .replace(/[？]/g, "?")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    image.src = url;
  });
}

async function preprocessImageForOcr(file) {
  const image = await loadImage(file);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(4, Math.max(2, 2400 / Math.max(longest, 1)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    total += gray;
  }
  const avg = total / (data.length / 4);
  const threshold = Math.max(135, Math.min(205, avg - 18));
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    gray = (gray - 128) * 1.8 + 128;
    const value = gray < threshold ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function ocrScore(text) {
  const normalized = normalizeOcrText(text);
  const numbers = (normalized.match(/\b[0-4]?\d\b/g) || []).length;
  const amounts = (normalized.match(/(?:各数|每数|个数|各肖|每肖|各尾|每尾|各|每|=|＝|\?|？|\/|／)\s*\d+/g) || []).length;
  const zodiacs = (normalized.match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || []).length;
  const noise = (normalized.match(/[A-Za-z]{2,}/g) || []).length;
  return numbers * 3 + amounts * 8 + zodiacs * 4 - noise * 2;
}

function isUsableOcrText(text) {
  const normalized = normalizeOcrText(text);
  const numbers = (normalized.match(/\b[0-4]?\d\b/g) || []).length;
  const amountHints = (normalized.match(/各数|每数|个数|各肖|每肖|各尾|每尾|各|每|斤|元|米|块|=|＝|\?|？|\/|／/g) || []).length;
  const zodiacs = (normalized.match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || []).length;
  const latinWords = (normalized.match(/[A-Za-z]{2,}/g) || []).length;
  const chineseChars = (normalized.match(/[\u4e00-\u9fff]/g) || []).length;
  const usefulLines = normalized.split(/\n+/).filter((line) => {
    const lineNumbers = (line.match(/\b[0-4]?\d\b/g) || []).length;
    return lineNumbers >= 3 || /各数|每数|个数|各肖|每肖|各尾|每尾|各|每|斤|元|米|块|=|＝|\?|？|\/|／/.test(line);
  }).length;
  if (numbers < 2 && zodiacs < 2) return false;
  if (amountHints < 1 && usefulLines < 2) return false;
  if (latinWords > numbers + zodiacs + amountHints) return false;
  if (latinWords >= 4 && chineseChars < 6) return false;
  return true;
}

function pickBestOcrText(results) {
  return results
    .map((text) => ({ text, score: ocrScore(text) }))
    .sort((a, b) => b.score - a.score)[0]?.text || "";
}

async function recognizeImageOrders(file) {
  if (!file) return;
  try {
    const Tesseract = await ensureTesseract();
    const processedImage = await preprocessImageForOcr(file);
    setOcrStatus("正在识别图片 1/2...");
    const ocrOptions = {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setOcrStatus(`正在识别 ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      tessedit_char_whitelist: "0123456789一二三四五六七八九十百千万鼠牛虎兔龙蛇马羊猴鸡狗猪新门澳澳门香港港特码特肖平肖连肖平尾各每个数斤元米块=＝?？/／.-、，, "
    };
    const processedResult = await Tesseract.recognize(processedImage, "chi_sim+eng", ocrOptions);
    setOcrStatus("正在识别图片 2/2...");
    const originalResult = await Tesseract.recognize(file, "chi_sim+eng", {
      ...ocrOptions,
      tessedit_pageseg_mode: "11"
    });
    const text = normalizeOcrText(pickBestOcrText([processedResult?.data?.text, originalResult?.data?.text]));
    if (!text) {
      setOcrStatus("未识别到文字");
      return;
    }
    if (!isUsableOcrText(text)) {
      setOcrStatus("识别不清，未写入；请裁剪订单区域或换清晰图");
      return;
    }
    $("orderInput").value = text;
    parseOrders();
    setOcrStatus("文字已提取，请先核对");
  } catch {
    setOcrStatus("图片识别失败，可换清晰截图再试");
  } finally {
    $("imageOcrInput").value = "";
  }
}

function renderParsed() {
  $("parseStatus").textContent = parsed.length ? `已解析 ${parsed.length} 条` : "等待输入";
  $("parsedRows").innerHTML = parsed.map((o, index) => `
    <tr>
      <td>
        <select class="parsed-edit" data-index="${index}" data-field="region">
          <option value="澳门" ${o.region === "澳门" ? "selected" : ""}>澳门</option>
          <option value="香港" ${o.region === "香港" ? "selected" : ""}>香港</option>
        </select>
      </td>
      <td>
        <select class="parsed-edit" data-index="${index}" data-field="type">
          ${visiblePlayTypes.map((type) => `<option value="${type}" ${o.type === type ? "selected" : ""}>${type}</option>`).join("")}
        </select>
      </td>
      <td class="targets-cell">
        <div class="parsed-mobile-controls">
          <select class="parsed-edit" data-index="${index}" data-field="type">
            ${visiblePlayTypes.map((type) => `<option value="${type}" ${o.type === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
          <button class="plain danger-text parsed-delete" data-index="${index}" type="button">删除本行</button>
        </div>
        <textarea class="parsed-edit parsed-targets" data-index="${index}" data-field="targets" rows="2">${htmlEscape(o.targets.join(" "))}</textarea>
      </td>
      <td><input class="parsed-edit parsed-number" data-index="${index}" data-field="amount" type="number" min="0" step="0.01" value="${money(o.amount)}" /></td>
      <td><input class="parsed-edit parsed-number" data-index="${index}" data-field="odds" type="number" min="0" step="0.01" value="${money(o.odds)}" /></td>
      <td>${money(o.total)}</td>
      <td class="${o.warnings.length ? "warn" : "ok"}">${o.warnings.join("，") || o.hint || "可入库"}</td>
      <td><button class="plain parsed-duplicate" data-index="${index}" type="button">复制</button><button class="plain danger-text parsed-delete" data-index="${index}" type="button">删除</button></td>
    </tr>
  `).join("");
  $("parsedRows").querySelectorAll(".parsed-edit").forEach((input) => input.addEventListener("change", updateParsedFromEdit));
  $("parsedRows").querySelectorAll(".parsed-delete").forEach((button) => {
    button.addEventListener("click", () => {
      parsed.splice(Number(button.dataset.index), 1);
      renderParsed();
      renderDeferred();
    });
  });
  $("parsedRows").querySelectorAll(".parsed-duplicate").forEach((button) => {
    button.addEventListener("click", () => duplicateParsedOrder(Number(button.dataset.index)));
  });
}

function duplicateParsedOrder(index) {
  const source = parsed[index];
  if (!source) return;
  const copy = {
    ...source,
    id: makeId(),
    targets: [...(source.targets || [])],
    warnings: [...(source.warnings || [])],
    raw: `${source.raw || $("orderInput")?.value || ""}（人工拆分）`
  };
  parsed.splice(index + 1, 0, copy);
  renderParsed();
  renderDeferred();
}

function addParsedOrder() {
  const customer = currentCustomer();
  const source = parsed[parsed.length - 1];
  const order = applyCustomerDefaults(makeOrder({
    raw: `${$("orderInput")?.value || ""}（人工新增）`,
    region: $("defaultRegion")?.value || "澳门",
    type: $("defaultType")?.value || "特码",
    targets: [],
    amount: 0
  }), customer);
  if (source?.sourceItemId) {
    order.sourceBatchId = source.sourceBatchId;
    order.sourceItemId = source.sourceItemId;
    order.sourceItemIndex = source.sourceItemIndex;
    order.sourceItemText = source.sourceItemText;
  }
  parsed.push(order);
  renderParsed();
  renderDeferred();
}

function updateParsedFromEdit(event) {
  const input = event.currentTarget;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;
  const order = parsed[index];
  if (!order) return;
  if (field === "targets") order.targets = normalizeManualTargets(input.value);
  else if (field === "amount" || field === "odds") order[field] = Number(input.value || 0);
  else order[field] = input.value;
  if (field === "targets" || field === "type") {
    order.packageTotal = false;
  }
  refreshParsedOrder(index);
  const customer = customerById(order.customerId);
  if (field === "type") {
    order.odds = customerOdds(customer, order);
    order.rebate = customerRebate(customer, order);
  }
  const expandedOrders = expandZodiacComboOrder(order).flatMap(expandMainZodiacSingles);
  if (expandedOrders.length > 1) {
    parsed.splice(index, 1, ...expandedOrders.map((item) => applyCustomerDefaults(item, customer)));
  }
  renderParsed();
  renderDeferred();
}

function isZodiacRiskOrder(order) {
  return ["平肖", "一肖", "主肖"].includes(order?.type);
}

function orderZodiacExposure(order) {
  if (!isZodiacRiskOrder(order)) return [];
  const rows = [];
  const perTargetAmount = targetStakeAmount(order);
  (order?.targets || []).forEach((target) => {
    const text = String(target);
    if (zodiacOrder.includes(text)) {
      rows.push({ zodiac: text, amount: perTargetAmount });
      return;
    }
    const number = Number(text);
    if (!Number.isNaN(number) && number >= 1 && number <= 49) {
      rows.push({ zodiac: numberMeta(number).zodiac, amount: perTargetAmount });
    }
  });
  return rows;
}

function comboSchemeKey(order) {
  const targets = uniqueTargets(order.targets || []).map(String).sort((a, b) => a.localeCompare(b, "zh-Hans"));
  return [order.region || "", order.type || "", targets.join(" ")].join("|");
}

function comboSchemeLabel(order) {
  const targets = uniqueTargets(order.targets || []).map(String).join(" ");
  return `${order.region || ""} ${order.type || ""} ${targets}`.trim();
}

function comboRiskRows(sourceOrders) {
  const groups = new Map();
  sourceOrders
    .filter((order) => isZodiacComboType(order.type))
    .forEach((order) => {
      const key = comboSchemeKey(order);
      const current = groups.get(key) || {
        label: comboSchemeLabel(order),
        total: 0,
        count: 0
      };
      current.total += Number(order.total || order.amount || 0);
      current.count += 1;
      groups.set(key, current);
    });
  return [...groups.values()]
    .sort((a, b) => (b.count - a.count) || (b.total - a.total) || a.label.localeCompare(b.label, "zh-Hans"));
}

function renderZodiacRisk() {
  const totals = Object.fromEntries(zodiacOrder.map((zodiac) => [zodiac, 0]));
  const sourceOrders = [
    ...orders,
    ...parsed.filter((order) => !order.warnings?.length)
  ];
  sourceOrders.forEach((order) => {
    orderZodiacExposure(order).forEach(({ zodiac, amount }) => {
      totals[zodiac] += Number(amount || 0);
    });
  });
  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  $("zodiacRiskSummary").textContent = total ? `12 个生肖累计 ${money(total)}` : "12 个生肖累计金额";
  $("zodiacRiskRows").innerHTML = zodiacOrder.map((zodiac) => `
    <div class="zodiac-risk-card">
      <span>一肖${zodiac}</span>
      <b>${money(totals[zodiac])}</b>
    </div>
  `).join("");
  const comboRows = comboRiskRows(sourceOrders);
  const comboBox = $("comboRiskRows");
  if (comboBox) {
    comboBox.innerHTML = comboRows.length ? `
      <div class="combo-risk-title">连肖方案汇总</div>
      ${comboRows.map((row) => `
        <div class="combo-risk-item ${row.count > 1 ? "combo-risk-warn" : ""}">
          <span>${htmlEscape(row.label)}</span>
          <b>${money(row.total)}</b>
          ${row.count > 1 ? `<em>重复 ${row.count} 笔，金额已合并，注意风险</em>` : ""}
        </div>
      `).join("")}
    ` : `<div class="combo-risk-empty">暂无连肖方案</div>`;
  }
}

function renderDeferred() {
  renderZodiacRisk();
}

function saveParsed() {
  parsed.forEach((_, index) => refreshParsedOrder(index));
  const valid = parsed.filter((o) => !o.warnings.length);
  if (!valid.length) {
    alert("没有可入库的注单，请先检查解析提示。");
    return;
  }
  const remember = $("rememberCorrection")?.checked;
  const remembered = remember && saveLearningCase();
  const customer = currentCustomer();
  const savedAt = new Date().toISOString();
  orders = [...valid.map((o) => ({
    ...o,
    customerId: customer.id,
    customerName: customer.name,
    rebate: Number(o.rebate ?? customerRebate(customer, o) ?? 0),
    id: makeId(),
    createdAt: savedAt,
    sourceSavedAt: savedAt
  })), ...orders];
  parsed = [];
  deferredLines = [];
  $("orderInput").value = "";
  saveAll();
  renderAll();
  if (remembered) alert("本次人工修正已保存到本地解析学习库");
}

function parseDrawNumbers() {
  const nums = [...$("drawNumbers").value.matchAll(/\b([0-4]?\d)\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 49);
  return nums.slice(0, 7);
}

function latestDrawRecord(records) {
  const list = Array.isArray(records) ? records : Object.values(records || {});
  return list
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => String(b.issueCode || b.issue || b.expect || b.period || b.openTime || "").localeCompare(String(a.issueCode || a.issue || a.expect || a.period || a.openTime || "")))[0] || {};
}

function extractDrawPayload(data) {
  if (Array.isArray(data)) return data[0] || {};
  if (Array.isArray(data?.data)) return data.data[0] || {};
  if (Array.isArray(data?.rows)) return data.rows[0] || {};
  if (Array.isArray(data?.list)) return data.list[0] || {};
  if (Array.isArray(data?.result?.data)) return data.result.data[0] || {};
  if (Array.isArray(data?.result?.list)) return data.result.list[0] || {};
  if (data?.data && typeof data.data === "object") return data.data.openCode ? data.data : latestDrawRecord(data.data);
  if (data?.result && typeof data.result === "object") return Array.isArray(data.result) ? data.result[0] || {} : data.result;
  return data || {};
}

function extractDrawNumbers(value) {
  if (Array.isArray(value)) return value.map((n) => Number(n)).filter((n) => n >= 1 && n <= 49).slice(0, 7);
  return [...String(value || "").matchAll(/\b([0-4]?\d)\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 49)
    .slice(0, 7);
}

function drawApiForRegion(region) {
  return region === "香港" ? HONGKONG_DRAW_API : MACAU_DRAW_API;
}

async function fetchJsonWithFallback(url) {
  if (!url) throw new Error("missing-draw-api-url");
  const urls = CORS_PROXY ? [url, `${CORS_PROXY}${encodeURIComponent(url)}`] : [url];
  let lastError;
  for (const apiUrl of urls) {
    try {
      const response = await fetch(apiUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("draw-api-failed");
      const text = await response.text();
      return JSON.parse(text.replace(/^\s*[\w$]+\((.*)\)\s*;?\s*$/s, "$1"));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("draw-api-failed");
}

async function fetchLatestDraw() {
  const region = $("drawRegion").value || "澳门";
  $("drawSummary").textContent = `正在拉取${region}开奖...`;
  try {
    const payload = extractDrawPayload(await fetchJsonWithFallback(drawApiForRegion(region)));
    const period = payload.issueCode || payload.expect || payload.issue || payload.period || payload.openExpect || payload.qihao || payload.term || payload.no || payload.number || "";
    const nums = extractDrawNumbers(payload.openCode || payload.open_code || payload.code || payload.numbers || payload.result || payload.opencode || payload.openNumber || payload.open_number);
    if (nums.length !== 7) throw new Error("draw-data-invalid");
    $("drawPeriod").value = String(period || "").trim();
    $("drawNumbers").value = nums.map(pad).join(" ");
    const special = numberMeta(nums[6]);
    $("drawSummary").textContent = `已拉取${region}${period ? ` ${period}` : ""}：${nums.map(pad).join(" ")}，特码 ${special.label} ${special.zodiac} ${special.color}`;
  } catch {
    $("drawSummary").textContent = `${region}开奖接口读取失败，请稍后再试或手动输入开奖号码`;
  }
}

function targetNumbers(order) {
  return new Set((order.targets || [])
    .map((target) => Number(target))
    .filter((n) => n >= 1 && n <= 49)
    .map(pad));
}

function drawNumberSet(nums) {
  return new Set(nums.map(pad));
}

function targetTails(order) {
  return uniqueTargets((order.targets || []).map((target) => String(Number(target)).slice(-1)));
}

function isWinner(order, drawNums) {
  const special = drawNums[6];
  if (!special) return false;
  const specialMeta = numberMeta(special);
  const allMetas = drawNums.map(numberMeta);
  const firstSix = drawNums.slice(0, 6);
  const firstSixSet = drawNumberSet(firstSix);
  const allSet = drawNumberSet(drawNums);
  const targets = targetNumbers(order);
  if (order.type === "特码") return order.targets.includes(pad(special));
  if (order.type === "特肖") return order.targets.includes(specialMeta.zodiac);
  if (order.type === "平肖" || order.type === "一肖" || order.type === "主肖") return allMetas.some((m) => order.targets.includes(m.zodiac));
  if (isZodiacComboType(order.type)) return order.targets.every((target) => allMetas.some((m) => m.zodiac === target));
  if (order.type === "平尾") return allMetas.some((m) => order.targets.includes(String(m.tail)));
  if (/连尾$/.test(order.type)) return targetTails(order).every((tail) => allMetas.some((m) => String(m.tail) === tail));
  if (/不中$/.test(order.type)) return [...targets].every((target) => !allSet.has(target));
  if (order.type === "二中二") return targets.size >= 2 && [...targets].every((target) => firstSixSet.has(target));
  if (order.type === "三中三") return targets.size >= 3 && [...targets].every((target) => firstSixSet.has(target));
  if (order.type === "特串") return [...targets].some((target) => firstSixSet.has(target)) && targets.has(pad(special));
  if (order.type === "波色") return order.targets.includes(specialMeta.color);
  if (order.type === "半波") return order.targets.some((t) => specialMeta.color[0] === t[0] && (t.includes(specialMeta.size) || t.includes(specialMeta.oddEven)));
  return false;
}

function winningUnits(order, drawNums) {
  const special = drawNums[6];
  if (!special) return 0;
  if (order.type === "特码") return (order.targets || []).filter((target) => String(target) === pad(special)).length;
  if (["平肖", "一肖", "主肖"].includes(order.type)) {
    const winningZodiacs = new Set(drawNums.map(numberMeta).map((meta) => meta.zodiac));
    return new Set((order.targets || []).filter((target) => winningZodiacs.has(target))).size;
  }
  return isWinner(order, drawNums) ? 1 : 0;
}

function refreshSettledOrder(order) {
  const drawNums = (order.drawNumbers || []).map((n) => Number(n)).filter((n) => n >= 1 && n <= 49);
  if (drawNums.length !== 7) return order;
  const hitUnits = winningUnits(order, drawNums);
  const hit = hitUnits > 0;
  const winAmount = hit ? payoutAmount(order) * Number(order.odds || 0) * hitUnits : 0;
  const rebateAmount = rebateAmountFor(order.total, order.rebate);
  return {
    ...order,
    status: hit ? "中奖" : "未中奖",
    winAmount,
    rebateAmount,
    profit: winAmount + rebateAmount - Number(order.total || 0)
  };
}

function settleOrders() {
  if (reportCopySnapshot) {
    alert("上一批上报尚未确认发送，请先点击“确认已发送”再结算");
    return;
  }
  const nums = parseDrawNumbers();
  if (nums.length !== 7) {
    alert("请输入 7 个开奖号码。");
    return;
  }
  const region = $("drawRegion").value;
  const period = $("drawPeriod").value.trim() || "未填期号";
  orders = orders.map((o) => {
    if (o.region !== region) return o;
    const hitUnits = winningUnits(o, nums);
    const hit = hitUnits > 0;
    const winAmount = hit ? payoutAmount(o) * o.odds * hitUnits : 0;
    const rebateAmount = rebateAmountFor(o.total, o.rebate);
    return {
      ...o,
      period,
      drawNumbers: nums.map(pad),
      status: hit ? "中奖" : "未中奖",
      winAmount,
      rebateAmount,
      profit: winAmount + rebateAmount - o.total
    };
  });
  const special = numberMeta(nums[6]);
  $("drawSummary").textContent = `${region} ${period}：${nums.map(pad).join(" ")}，特码 ${special.label} ${special.zodiac} ${special.color}`;
  saveAll();
  renderAll();
}

function clearSettlement() {
  orders = orders.map((o) => ({ ...o, status: "待开奖", winAmount: 0, profit: 0, drawNumbers: null, period: null }));
  saveAll();
  $("drawSummary").textContent = "尚未开奖";
  renderAll();
}

function exposureForNumber(region, n, limit = 0) {
  const meta = numberMeta(n);
  const active = orders.filter((o) => o.region === region && o.type === "特码");
  let payout = 0;
  let direct = 0;
  const sources = [];
  for (const order of active) {
    const hitCount = (order.targets || []).filter((target) => String(target) === pad(n)).length;
    const sourceAmount = targetStakeAmount(order) * hitCount;
    if (hitCount) payout += sourceAmount * order.odds;
    direct += sourceAmount;
    if (sourceAmount > 0) {
      sources.push({
        customer: order.customerName || "散客",
        amount: sourceAmount
      });
    }
  }
  const grossStake = active.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const customerRebate = 0;
  const stake = grossStake;
  const adjust = Number(adjustments[region]?.[pad(n)] || 0);
  const storedReported = Number(reported[region]?.[pad(n)] || reported[region]?.[meta.label] || 0);
  const total = direct;
  const manualReport = Math.min(total, Math.max(0, adjust + storedReported));
  const balance = Math.max(0, total - manualReport);
  const autoReport = limit > 0 ? Math.max(0, balance - limit) : 0;
  const reportAmount = manualReport;
  return { n, meta, stake, grossStake, customerRebate, payout, direct, sources, adjust, total, balance, autoReport, reportAmount, profit: 0, excess: 0 };
}

function sourceSummary(row) {
  if (!row.sources?.length) return "";
  return `${row.sources.length}笔 / ${money(row.sources.reduce((sum, source) => sum + Number(source.amount || 0), 0))}`;
}

function sourceDetails(row) {
  if (!row.sources?.length) return "";
  return row.sources.map((source) => `<div>${htmlEscape(source.customer)}：${money(source.amount)}</div>`).join("");
}

function reportLine(row) {
  return `${row.meta.label}=${money(row.pendingReport)}`;
}

function reportText(rows) {
  const lines = rows.map(reportLine);
  const chunks = [];
  for (let i = 0; i < lines.length; i += 3) {
    chunks.push(lines.slice(i, i + 3).join("    "));
  }
  return chunks.join("\n");
}

function persistReportConfirmation() {
  if (reportCopySnapshot) safeStorageSet(REPORT_PENDING_KEY, JSON.stringify(reportCopySnapshot));
  else {
    try { localStorage.removeItem(REPORT_PENDING_KEY); } catch {}
  }
}

async function writeReportClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    $("reportText").value = text;
    $("reportText").focus();
    $("reportText").select();
    return Boolean(document.execCommand?.("copy"));
  }
}

async function copyReportList() {
  if (reportCopySnapshot) {
    if (!confirm("上一批上报尚未点击“确认已发送”。\n确定重新复制上一批内容吗？")) return;
    $("reportText").value = reportCopySnapshot.text;
    const copied = await writeReportClipboard(reportCopySnapshot.text);
    $("riskSummary").textContent = copied ? "上一批已重新复制，仍等待确认发送" : "复制失败，请长按内容复制";
    return;
  }
  const region = $("riskRegion").value;
  const limit = Number($("riskLimit").value || 0);
  const rows = riskRowsAtLimit(region, limit).filter((row) => Number(row.pendingReport || 0) > 0);
  const text = reportText(rows);
  if (!text) {
    alert("没有需要上报的号码。");
    return;
  }
  reportCopySnapshot = { region, createdAt: new Date().toISOString(), rows: rows.map((row) => ({ label: row.meta.label, pendingReport: Number(row.pendingReport || 0) })), text };
  persistReportConfirmation();
  $("reportText").value = text;
  const copied = await writeReportClipboard(text);
  $("riskSummary").textContent = copied ? `已复制本批 ${rows.length} 个号码，等待确认发送` : "复制失败，请长按内容复制";
}

function markReportSubmitted() {
  const region = $("riskRegion").value;
  if (!reportCopySnapshot || reportCopySnapshot.region !== region) {
    alert("请先一键复制，系统会锁定本次上报批次");
    return;
  }
  reported[region] = reported[region] || {};
  reportCopySnapshot.rows.forEach((row) => {
    const pending = Number(row.pendingReport || 0);
    if (pending > 0) {
      reported[region][row.label] = Number(reported[region][row.label] || 0) + pending;
    }
  });
  reportCopySnapshot = null;
  persistReportConfirmation();
  saveAll();
  renderRisk();
  $("riskSummary").textContent = "本批已确认发送";
}

function clearReportedList() {
  const region = $("riskRegion").value;
  reported[region] = {};
  adjustments[region] = {};
  reportCopySnapshot = null;
  persistReportConfirmation();
  saveAll();
  renderRisk();
  $("riskSummary").textContent = "已清空已上报记录";
}

function riskSnapshot(region, limit) {
  const rows = Array.from({ length: 49 }, (_, i) => {
    const row = exposureForNumber(region, i + 1, limit);
    row.rawBalance = Number(row.balance || 0);
    row.pendingReport = limit > 0 ? Math.max(0, row.rawBalance - limit) : 0;
    row.balance = Math.max(0, row.rawBalance - row.pendingReport);
    row.excess = row.pendingReport;
    row.reported = row.reportAmount;
    return row;
  });
  const balanceTotal = rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
  const reportTotal = rows.reduce((sum, row) => sum + Number(row.reportAmount || 0) + Number(row.pendingReport || 0), 0);
  const adjustOdds = Number($("adjustOdds").value || 47);
  rows.forEach((row) => {
    row.payoutAfterReport = Number(row.balance || 0) * adjustOdds;
    row.profit = balanceTotal - row.payoutAfterReport;
  });
  return { rows, balanceTotal, reportTotal, adjustOdds };
}

function riskRowsAtLimit(region, limit) {
  return riskSnapshot(region, limit).rows;
}

function maxSafeRiskLimit(region) {
  const snapshot = riskSnapshot(region, 0);
  const maxBalance = Math.max(...snapshot.rows.map((row) => Number(row.balance || 0)), 0);
  if (!snapshot.balanceTotal || !snapshot.adjustOdds || !maxBalance) return { limit: 0, minProfit: 0 };
  const limit = Math.max(0, Math.min(maxBalance, Math.floor(snapshot.balanceTotal / snapshot.adjustOdds)));
  return { limit, minProfit: snapshot.balanceTotal - (limit * snapshot.adjustOdds) };
}

function aggressiveRiskLimit(region, targetLoss = 5000) {
  const safe = maxSafeRiskLimit(region);
  const snapshot = riskSnapshot(region, 0);
  const balances = snapshot.rows.map((row) => Math.max(0, Number(row.rawBalance ?? row.balance ?? 0)));
  const maxBalance = Math.floor(Math.max(...balances, 0));
  const start = Math.max(1, Math.floor(Number(safe.limit || 0)) + 1);
  if (!maxBalance || !snapshot.adjustOdds || start > maxBalance) {
    return { limit: Math.max(0, Math.floor(Number(safe.limit || 0))), minProfit: Number(safe.minProfit || 0) };
  }
  const profitAt = (limit) => {
    const cappedTotal = balances.reduce((sum, balance) => sum + Math.min(balance, limit), 0);
    return cappedTotal - (Math.min(maxBalance, limit) * snapshot.adjustOdds);
  };
  let best = { limit: start, minProfit: profitAt(start) };
  const consider = (limit) => {
    const minProfit = profitAt(limit);
    const distance = Math.abs(minProfit + targetLoss);
    const bestDistance = Math.abs(best.minProfit + targetLoss);
    if (distance < bestDistance || (distance === bestDistance && limit > best.limit)) best = { limit, minProfit };
  };
  const step = Math.max(1, Math.ceil((maxBalance - start) / 1000));
  for (let limit = start; limit <= maxBalance; limit += step) consider(limit);
  consider(maxBalance);
  const refineStart = Math.max(start, best.limit - step);
  const refineEnd = Math.min(maxBalance, best.limit + step);
  for (let limit = refineStart; limit <= refineEnd; limit += 1) consider(limit);
  return best;
}

function applySmartRiskLimit() {
  const region = $("riskRegion").value;
  const recommendation = maxSafeRiskLimit(region);
  $("riskLimit").value = money(recommendation.limit);
  setRiskLimitForRegion(region, recommendation.limit);
  renderRisk();
  $("riskSummary").textContent = `已填入${region}智能推荐阈值 ${money(recommendation.limit)}`;
}

function changeRiskRegion() {
  const region = $("riskRegion").value;
  $("riskLimit").value = money(riskLimitForRegion(region));
  applyReportSettingsToControls(region);
  renderRisk();
}

function updateReportSettingsFromInput() {
  const region = $("riskRegion").value;
  setReportSettingsForRegion(region, $("adjustOdds").value, $("adjustRebate").value);
  renderRisk();
}

function renderRisk() {
  const region = $("riskRegion").value;
  const limit = Number($("riskLimit").value || 0);
  setRiskLimitForRegion(region, limit);
  const snapshot = riskSnapshot(region, limit);
  const rows = snapshot.rows;
  const balanceTotal = snapshot.balanceTotal;
  const reportTotal = snapshot.reportTotal;
  rows.sort((a, b) => b.pendingReport - a.pendingReport || b.excess - a.excess || b.balance - a.balance || a.profit - b.profit || a.n - b.n);
  const profits = rows.map((r) => r.profit);
  const specialOrderTotal = orders
    .filter((order) => order.region === region && order.type === "特码")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const riskDirectTotal = rows.reduce((sum, row) => sum + Number(row.direct || 0), 0);
  const riskDiff = riskDirectTotal - specialOrderTotal;
  $("maxProfit").textContent = money(Math.max(...profits, 0));
  $("maxLoss").textContent = money(Math.min(...profits, 0));
  $("specialRiskCheck").textContent = `${money(specialOrderTotal)} - ${money(reportTotal)} = ${money(balanceTotal)}${riskDiff ? ` 差${money(riskDiff)}` : ""}`;
  $("reportTotal").textContent = money(reportTotal);
  const smartLimit = maxSafeRiskLimit(region);
  const aggressiveLimit = aggressiveRiskLimit(region, 5000);
  const smartLabel = smartLimit.unsafe
    ? `推荐 ${money(smartLimit.limit)}（仍亏 ${money(smartLimit.minProfit)}）`
    : `推荐 ${money(smartLimit.limit)}`;
  $("smartRiskLimitText").textContent = `${smartLabel}，激进 ${money(aggressiveLimit.limit)}（最坏约 ${money(aggressiveLimit.minProfit)}）`;
  const reportRows = rows.filter((r) => r.pendingReport > 0);
  $("riskSummary").textContent = `${region} 49 号码风险，待上报 ${reportRows.length} 个`;
  $("reportText").value = reportText(reportRows);
  $("riskRows").innerHTML = rows.map((r) => `
    <tr class="${r.excess > 0 ? "risk-over" : ""}">
      <td>${r.meta.label}</td>
      <td>${r.meta.zodiac}</td>
      <td>${money(r.direct)}</td>
      <td class="source-cell">${r.sources?.length ? `<details><summary>${htmlEscape(sourceSummary(r))}</summary>${sourceDetails(r)}</details>` : "-"}</td>
      <td><input data-adjust="${r.meta.label}" type="number" min="0" step="1" value="${money(r.adjust)}" /></td>
      <td>${money(r.balance)}</td>
      <td class="${r.excess > 0 ? "bad" : "ok"}">${money(r.excess)}</td>
      <td class="${r.profit >= 0 ? "ok" : "bad"}">${money(r.profit)}</td>
    </tr>
  `).join("");
  $("reportRows").innerHTML = reportRows.length ? reportRows.map((r) => `
    <tr>
      <td>${r.meta.label}</td>
      <td>${money(r.balance)}</td>
      <td>${money(r.reported)}</td>
      <td class="bad">${money(r.pendingReport)}</td>
      <td class="source-cell">${r.sources?.length ? `<details><summary>${htmlEscape(sourceSummary(r))}</summary>${sourceDetails(r)}</details>` : "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="5" class="muted-cell">没有新的待上报号码</td></tr>`;
  $("riskRows").querySelectorAll("input[data-adjust]").forEach((input) => {
    input.addEventListener("input", () => {
      adjustments[region] = adjustments[region] || {};
      adjustments[region][input.dataset.adjust] = Number(input.value || 0);
      saveAll();
      renderRisk();
    });
  });
  renderCustomerSettlement();
}

function updateRiskLimitFromInput() {
  const region = $("riskRegion").value;
  setRiskLimitForRegion(region, $("riskLimit").value);
  renderRisk();
  $("riskSummary").textContent = `已保存${region}留额阈值 ${money($("riskLimit").value)}`;
}

function renderCustomerSettlement() {
  renderReportSettlement();
  const customersMap = new Map();
  orders.forEach((order) => {
    const name = order.customerName || "散客";
    if (!customersMap.has(name)) customersMap.set(name, { name, sourceItems: new Map() });
    const customer = customersMap.get(name);
    const sourceId = order.sourceItemId || `legacy_${order.id}`;
    if (!customer.sourceItems.has(sourceId)) {
      customer.sourceItems.set(sourceId, {
        id: sourceId,
        index: Number(order.sourceItemIndex || 0),
        text: order.sourceItemText || order.raw || `${order.region || ""} ${order.type || ""} ${(order.targets || []).join(" ")}`.trim(),
        savedAt: order.sourceSavedAt || order.createdAt || "",
        orders: []
      });
    }
    customer.sourceItems.get(sourceId).orders.push(order);
  });
  const rows = [...customersMap.values()].map((customer) => {
    customer.items = [...customer.sourceItems.values()]
      .sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)) || a.index - b.index)
      .map((item, displayIndex) => {
        const baseTotal = item.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const baseWin = item.orders.reduce((sum, order) => sum + Number(order.winAmount || 0), 0);
        const baseRebate = item.orders.reduce((sum, order) => sum + Number(order.rebateAmount ?? rebateAmountFor(order.total, order.rebate)), 0);
        const manual = settlementManual[item.id] || {};
        const total = settlementManualNumber(manual.total, baseTotal);
        const win = settlementManualNumber(manual.win, baseWin);
        const rebate = settlementManualNumber(manual.rebate, baseRebate);
        return { ...item, displayIndex: displayIndex + 1, baseTotal, baseWin, baseRebate, total, win, rebate, net: win + rebate - total, manual };
      });
    customer.total = customer.items.reduce((sum, item) => sum + item.total, 0);
    customer.win = customer.items.reduce((sum, item) => sum + item.win, 0);
    customer.rebate = customer.items.reduce((sum, item) => sum + item.rebate, 0);
    customer.net = customer.items.reduce((sum, item) => sum + item.net, 0);
    return customer;
  });
  const root = $("customerSettlementRows");
  root.innerHTML = rows.length ? rows.map((customer) => {
    const resultText = customer.net > 0 ? `应付客户 ${money(customer.net)}` : customer.net < 0 ? `客户应付 ${money(Math.abs(customer.net))}` : "本期已结清";
    return `
      <details class="customer-settlement-sheet" open>
        <summary>
          <span><b>${htmlEscape(customer.name)}</b><small>${customer.items.length} 个原始项目</small></span>
          <strong class="${customer.net > 0 ? "settlement-pay-customer" : customer.net < 0 ? "settlement-customer-pay" : "ok"}">${resultText}</strong>
        </summary>
        <div class="customer-settlement-body">
          <div class="customer-settlement-metrics">
            <div><span>投注总额</span><b>${money(customer.total)}</b></div>
            <div><span>返水</span><b>${money(customer.rebate)}</b></div>
            <div><span>中奖合计</span><b>${money(customer.win)}</b></div>
            <div class="settlement-result-metric"><span>最终结算</span><b>${money(customer.net)}</b></div>
          </div>
          <div class="settlement-equation">中奖 ${money(customer.win)} + 返水 ${money(customer.rebate)} - 投注 ${money(customer.total)} = ${money(customer.net)}</div>
          <div class="settlement-source-items">
            ${customer.items.map((item) => {
              const changed = ["total", "win", "rebate"].some((field) => item.manual[field] !== undefined && item.manual[field] !== null && item.manual[field] !== "");
              return `<article class="settlement-source-item">
                <div class="settlement-source-heading"><b>第${item.displayIndex}项</b><span>${htmlEscape(item.text)}</span>${changed ? "<em>已人工修正</em>" : ""}</div>
                <div class="settlement-source-totals"><span>投注 <b>${money(item.total)}</b></span><span>中奖 <b>${money(item.win)}</b></span><span>返水 <b>${money(item.rebate)}</b></span><span>净额 <b>${money(item.net)}</b></span></div>
                <details class="settlement-manual-editor"><summary>人工录入 / 修正</summary><div class="settlement-manual-grid">
                  <label>实际投注<input type="number" step="0.01" data-source-item="${htmlEscape(item.id)}" data-settlement-field="total" value="${item.manual.total ?? ""}" placeholder="自动 ${money(item.baseTotal)}" /></label>
                  <label>实际中奖<input type="number" step="0.01" data-source-item="${htmlEscape(item.id)}" data-settlement-field="win" value="${item.manual.win ?? ""}" placeholder="自动 ${money(item.baseWin)}" /></label>
                  <label>实际返水<input type="number" step="0.01" data-source-item="${htmlEscape(item.id)}" data-settlement-field="rebate" value="${item.manual.rebate ?? ""}" placeholder="自动 ${money(item.baseRebate)}" /></label>
                  <label class="settlement-note-field">备注<input type="text" data-source-item="${htmlEscape(item.id)}" data-settlement-field="note" value="${htmlEscape(item.manual.note || "")}" /></label>
                </div><button type="button" class="plain" data-settlement-reset="${htmlEscape(item.id)}">恢复自动计算</button></details>
                <details class="settlement-order-details"><summary>展开解析明细（${item.orders.length}）</summary><div class="settlement-orders">${item.orders.map((order, index) => `<div class="settlement-order-row ${Number(order.winAmount || 0) > 0 ? "winner" : ""}"><b>${index + 1}. ${htmlEscape(order.region)} ${htmlEscape(order.type)} ${htmlEscape((order.targets || []).join(" "))}</b><span>投注 ${money(order.total)} · 中奖 ${money(order.winAmount || 0)} · 返水 ${money(order.rebateAmount ?? rebateAmountFor(order.total, order.rebate))}</span></div>`).join("")}</div></details>
                ${item.manual.note ? `<div class="settlement-note">备注：${htmlEscape(item.manual.note)}</div>` : ""}
              </article>`;
            }).join("")}
          </div>
          <button type="button" data-copy-settlement="${htmlEscape(customer.name)}">复制本客户对账单</button>
        </div>
      </details>
    `;
  }).join("") : `<div class="muted-cell settlement-empty">开奖后按客户汇总结算</div>`;
  root.querySelectorAll("[data-settlement-field]").forEach((input) => {
    input.addEventListener("change", () => updateSourceItemSettlementManual(input.dataset.sourceItem, input.dataset.settlementField, input.value));
  });
  root.querySelectorAll("[data-settlement-reset]").forEach((button) => {
    button.addEventListener("click", () => resetSourceItemSettlementManual(button.dataset.settlementReset));
  });
  root.querySelectorAll("[data-copy-settlement]").forEach((button) => {
    button.addEventListener("click", () => copyCustomerSettlement(button.dataset.copySettlement));
  });
}

function settlementManualNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return Number(fallback || 0);
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : Number(fallback || 0);
}

function updateSourceItemSettlementManual(sourceItemId, field, value) {
  const entry = { ...(settlementManual[sourceItemId] || {}) };
  if (field === "note") entry.note = String(value || "").trim();
  else if (value === "") delete entry[field];
  else entry[field] = Number(value || 0);
  entry.updatedAt = new Date().toISOString();
  settlementManual[sourceItemId] = entry;
  safeStorageSet(SETTLEMENT_MANUAL_KEY, JSON.stringify(settlementManual));
  saveDataBackup();
  renderCustomerSettlement();
}

function resetSourceItemSettlementManual(sourceItemId) {
  delete settlementManual[sourceItemId];
  safeStorageSet(SETTLEMENT_MANUAL_KEY, JSON.stringify(settlementManual));
  saveDataBackup();
  renderCustomerSettlement();
}

async function copyCustomerSettlement(name) {
  const customerOrders = orders.filter((order) => (order.customerName || "散客") === name);
  const groups = new Map();
  customerOrders.forEach((order) => {
    const id = order.sourceItemId || `legacy_${order.id}`;
    if (!groups.has(id)) groups.set(id, { id, text: order.sourceItemText || order.raw || "原始项目", orders: [] });
    groups.get(id).orders.push(order);
  });
  const items = [...groups.values()].map((item, index) => {
    const manual = settlementManual[item.id] || {};
    const baseTotal = item.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const baseWin = item.orders.reduce((sum, order) => sum + Number(order.winAmount || 0), 0);
    const baseRebate = item.orders.reduce((sum, order) => sum + Number(order.rebateAmount ?? rebateAmountFor(order.total, order.rebate)), 0);
    const total = settlementManualNumber(manual.total, baseTotal);
    const win = settlementManualNumber(manual.win, baseWin);
    const rebate = settlementManualNumber(manual.rebate, baseRebate);
    return { ...item, index: index + 1, total, win, rebate, net: win + rebate - total, note: manual.note || "" };
  });
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const win = items.reduce((sum, item) => sum + item.win, 0);
  const rebate = items.reduce((sum, item) => sum + item.rebate, 0);
  const net = win + rebate - total;
  const result = net > 0 ? `应付客户 ${money(net)}` : net < 0 ? `客户应付 ${money(Math.abs(net))}` : "本期已结清";
  const text = [
    `客户：${name}`,
    ...items.flatMap((item) => [`第${item.index}项：${item.text}`, `投注 ${money(item.total)}，中奖 ${money(item.win)}，返水 ${money(item.rebate)}，净额 ${money(item.net)}`, item.note ? `备注：${item.note}` : ""]).filter(Boolean),
    "——客户合计——",
    `投注总额：${money(total)}`,
    `中奖合计：${money(win)}`,
    `返水：${money(rebate)}`,
    `计算：${money(win)} + ${money(rebate)} - ${money(total)} = ${money(net)}`,
    `结果：${result}`
  ].filter(Boolean).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    alert("客户对账单已复制");
  } catch {
    alert(text);
  }
}

function reportSettlementSummary(region) {
  const reportMap = reported[region] || {};
  const reportAmount = Object.values(reportMap).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  const reportRebate = reportAmount * reportRebateForRegion(region);
  const settledOrder = orders.find((order) => order.region === region && Array.isArray(order.drawNumbers) && order.drawNumbers.length === 7);
  const special = settledOrder ? pad(Number(settledOrder.drawNumbers[6])) : "";
  const winningStake = special ? Math.max(0, Number(reportMap[special] || 0)) : 0;
  const reportWin = winningStake * reportOddsForRegion(region);
  return { reportAmount, reportRebate, reportWin, reportNet: reportWin + reportRebate - reportAmount };
}

function renderReportSettlement() {
  const region = $("drawRegion")?.value || $("riskRegion")?.value || "澳门";
  const summary = reportSettlementSummary(region);
  if ($("settlementReportStake")) $("settlementReportStake").textContent = money(summary.reportAmount);
  if ($("settlementReportRebate")) $("settlementReportRebate").textContent = money(summary.reportRebate);
  if ($("settlementReportWin")) $("settlementReportWin").textContent = money(summary.reportWin);
  if ($("settlementReportNet")) {
    $("settlementReportNet").textContent = money(summary.reportNet);
    $("settlementReportNet").className = summary.reportNet >= 0 ? "ok" : "bad";
  }
}

function renderOrders() {
  const q = $("orderSearch").value.trim();
  const rows = orders.filter((o) => !q || [o.customerName, o.region, o.type, o.targets.join(" "), o.status].join(" ").includes(q));
  $("orderRows").innerHTML = rows.map((o) => `
    <tr>
      <td><small>${new Date(o.createdAt).toLocaleString()}</small></td>
      <td>${htmlEscape(o.customerName || "散客")}</td>
      <td>${o.region}</td>
      <td>${o.type}</td>
      <td class="order-content-cell" data-mobile-meta="${htmlEscape(`${o.region || ""} · ${o.type || ""}`)}">
        <b>${htmlEscape(`${o.region || ""} ${o.type || ""}`.trim())}</b>
        <span>${htmlEscape((o.targets || []).join(" "))}</span>
      </td>
      <td>${money(o.amount)}</td>
      <td><input class="order-edit-number" data-order-id="${o.id}" data-field="odds" type="number" min="0" step="0.01" value="${money(o.odds)}" /></td>
      <td><input class="order-edit-number" data-order-id="${o.id}" data-field="rebate" type="number" min="0" step="0.01" value="${money(o.rebate)}" /></td>
      <td>${money(o.total)}</td>
      <td>${o.status}</td>
      <td class="${o.profit >= 0 ? "ok" : "bad"}">${money(o.profit)}</td>
      <td><button class="plain danger-text order-delete" data-order-id="${o.id}" type="button">撤单</button></td>
    </tr>
  `).join("");
  $("orderRows").querySelectorAll(".order-edit-number").forEach((input) => {
    input.addEventListener("change", updateSavedOrderFromEdit);
  });
  $("orderRows").querySelectorAll(".order-delete").forEach((button) => {
    button.addEventListener("click", deleteSavedOrder);
  });
}

function deleteSavedOrder(event) {
  const id = event.currentTarget.dataset.orderId;
  const order = orders.find((item) => item.id === id);
  if (!order) return;
  const label = `${order.customerName || "散客"} ${order.region} ${order.type} ${(order.targets || []).join(" ")} ${money(order.total)}`;
  if (!confirm(`确认撤单？\n${label}`)) return;
  orders = orders.filter((item) => item.id !== id);
  saveAll();
  renderAll();
}

function updateSavedOrderFromEdit(event) {
  const input = event.currentTarget;
  const order = orders.find((item) => item.id === input.dataset.orderId);
  if (!order) return;
  order[input.dataset.field] = Number(input.value || 0);
  Object.assign(order, refreshSettledOrder(order));
  saveAll();
  renderAll();
}

function renderStats() {
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  const win = orders.reduce((sum, o) => sum + (o.winAmount || 0), 0);
  const profit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
  $("totalOrders").textContent = orders.length;
  $("totalAmount").textContent = money(total);
  $("winAmount").textContent = money(win);
  $("netProfit").textContent = money(profit);
  const byType = {};
  orders.forEach((o) => {
    byType[o.type] = (byType[o.type] || 0) + o.total;
  });
  $("typeStats").innerHTML = Object.entries(byType)
    .map(([type, amount]) => `<div>${type}<b style="float:right">${money(amount)}</b></div>`)
    .join("") || "<div>暂无注单</div>";
}

function renderAll() {
  renderCustomers();
  renderParsed();
  renderDeferred();
  renderStats();
  renderRisk();
  renderOrders();
}

function clearOrders() {
  if (reportCopySnapshot) {
    alert("上一批上报尚未确认发送，请先点击“确认已发送”再删除注单");
    return;
  }
  const text = prompt("确认清空当前页面注单？清空后不可恢复。请输入：删除全部注单");
  if (text !== "删除全部注单") return;
  orders = [];
  parsed = [];
  deferredLines = [];
  adjustments = {};
  reported = {};
  $("orderInput").value = "";
  $("drawSummary").textContent = "尚未开奖";
  saveAll();
  renderAll();
}

function exportData() {
  const data = JSON.stringify({
    customers,
    riskSettings,
    aiExamples: loadAiExamples(),
    privacy: "注单数据不导出，仅保存在本机浏览器",
    exportedAt: new Date().toISOString()
  }, null, 2);
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fortune-ai-analytics-mvp-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function openEntryTools() {
  const tools = document.querySelector(".zodiac-risk-box");
  if (tools) {
    openMobilePanel("zodiac");
  }
}

function openCustomerDialog() {
  const dialog = $("customerDialog");
  if (!dialog) return;
  try {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }
  } catch {
    // Fall back to a regular fixed panel for mobile browsers with partial dialog support.
  }
  dialog.setAttribute("open", "");
  dialog.classList.add("fallback-open");
}

function closeCustomerDialog() {
  const dialog = $("customerDialog");
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open && !dialog.classList.contains("fallback-open")) {
    dialog.close();
    return;
  }
  dialog.classList.remove("fallback-open");
  dialog.removeAttribute("open");
}

function closeMobilePanels() {
  document.body.classList.remove("mobile-panel-active", "mobile-risk-mode", "mobile-settlement-mode");
  document.querySelectorAll(".mobile-panel-open").forEach((node) => {
    node.classList.remove("mobile-panel-open");
  });
}

function playDrawBlessingOnce() {
  const video = $("drawBlessingVideo");
  if (!video) return;
  video.muted = true;
  video.currentTime = 0;
  video.play().catch(() => {});
}

function openMobilePanel(name) {
  closeMobilePanels();
  let target = null;
  if (name === "zodiac") {
    target = $("zodiacPanel");
    if (target) target.open = true;
  } else if (name === "draw") {
    target = $("drawPanel");
  } else if (name === "risk") {
    target = $("riskPanel");
    document.body.classList.add("mobile-risk-mode");
  } else if (name === "settlement") {
    target = $("riskPanel");
    const settlement = $("settlementPanel");
    if (settlement) settlement.open = true;
    document.body.classList.add("mobile-settlement-mode");
  } else if (name === "stats") {
    target = $("statsPanel");
  }
  if (!target) return;
  document.body.classList.add("mobile-panel-active");
  target.classList.add("mobile-panel-open");
  if (name === "draw") playDrawBlessingOnce();
}

window.FortuneApp = {
  parseOrders,
  aiParseOrders,
  recognizeImageOrders,
  addCustomer,
  saveCustomerSettings,
  saveParsed,
  clearInput,
  fetchLatestDraw,
  copyReportList,
  markReportSubmitted,
  clearReportedList,
  settleOrders,
  clearSettlement,
  clearOrders,
  exportData,
  openCustomerDialog,
  closeCustomerDialog,
  openAiExamplesDialog,
  closeAiExamplesDialog,
  useCurrentInputAsExample,
  previewAiExample,
  reviseAiExample,
  saveAiExample,
  deleteAiExample,
  exportAiExamples,
  openEntryTools,
  openMobilePanel,
  closeMobilePanels
  ,openLearningLibrary
  ,closeLearningLibrary
  ,toggleLearningEnabled
  ,toggleLearningCase
  ,deleteLearningCase
  ,setLearningRuleStatus
  ,toggleLearningRule
  ,deleteLearningRule
  ,rememberCurrentCorrection
  ,addParsedOrder
  ,exportLearningPackage
  ,importLearningPackage
  ,syncRemoteLearningPackage
  ,publishLearningPackage
};

function bindControls() {
  if (reportCopySnapshot) setTimeout(() => alert("上一批上报内容尚未确认发送，请确认后点击“确认已发送”"), 0);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reportReminderArmed = true;
    else if (reportReminderArmed && reportCopySnapshot) {
      reportReminderArmed = false;
      alert("上一批上报内容尚未确认发送，请确认后点击“确认已发送”");
    }
  });
  setClick("parseBtn", parseOrders);
  setClick("addCustomerBtn", addCustomer);
  setClick("saveCustomerSettingsBtn", saveCustomerSettings);
  setClick("saveParsedBtn", saveParsed);
  setClick("clearInputBtn", clearInput);
  setClick("aiParseBtn", aiParseOrders);
  on("aiExamplesImport", "change", importAiExamples);
  setClick("fetchLatestDrawBtn", fetchLatestDraw);
  setClick("settleBtn", settleOrders);
  setClick("clearSettlementBtn", clearSettlement);
  setClick("clearOrdersBtn", clearOrders);
  setClick("openEntryToolsBtn", openEntryTools);
  on("orderInput", "input", scheduleParseOrders);
  on("orderInput", "paste", () => setTimeout(parseOrders, 0));
  on("defaultRegion", "change", parseOrders);
  on("defaultType", "change", parseOrders);
  on("entryCustomer", "change", parseOrders);
  on("settingsCustomer", "change", renderCustomerSettings);
    document.querySelectorAll("[data-mobile-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.mobilePanel;
      if (panel === "close") closeMobilePanels();
      else openMobilePanel(panel);
    });
  });
}

function resizeOrderInput() {
  const input = $("orderInput");
  if (!input) return;
  input.style.height = "auto";
  input.style.height = `${Math.max(118, input.scrollHeight)}px`;
}

function clearInput() {
  $("orderInput").value = "";
  resizeOrderInput();
  parsed = [];
  deferredLines = [];
  learningSnapshot = null;
  learningAppliedCaseId = null;
  learningLastDecision = { hit: false, caseId: null, matchType: "none", score: 0, finalSource: "original_parser", reason: "cleared", normalizedText: "" };
  if ($("rememberCorrection")) $("rememberCorrection").checked = false;
  renderParsed();
  renderDeferred();
}

function renderLearningEntryStatus() {
  const status = $("learningEntryStatus");
  const toggle = $("rememberCorrection");
  if (!status) return;
  const enabled = Boolean(learningSettings().enabled);
  status.textContent = learningAppliedCaseId
    ? "已参考本地人工纠错案例"
    : enabled ? "学习功能已开启" : "学习功能已关闭（原解析器模式）";
  const trace = $("learningTrace");
  if (trace) {
    const matchLabels = { exact: "精确案例", template: "表达模板", fuzzy: "近似表达", confirmed_rule: "已确认规则", none: "未匹配" };
    const sourceLabels = { learning_case: "学习案例", confirmed_learning_rule: "已确认学习规则", original_parser: "原解析器" };
    const reasonLabels = {
      applied: "已采用",
      exact_case_applied_baseline_changed: "原解析结果已变化；记录冲突后仍采用人工精确案例",
      no_matching_case: "学习库中没有匹配案例",
      learning_library_empty: "学习库为空",
      multiple_template_matches: "多个模板结论冲突",
      template_materialization_failed: "模板生成结果失败",
      learning_disabled: "学习总开关关闭",
      no_match: "未命中",
      not_checked: "尚未解析",
      cleared: "输入已清空"
    };
    const decision = learningLastDecision;
    trace.innerHTML = `
      <span>命中学习库：<b class="${decision.hit ? "ok" : "warn"}">${decision.hit ? "是" : "否"}</b></span>
      <span>案例/规则ID：<b>${htmlEscape(decision.caseId || "-")}</b></span>
      <span>匹配方式：<b>${htmlEscape(matchLabels[decision.matchType] || decision.matchType)}</b></span>
      <span>匹配分数：<b>${decision.hit ? `${Math.round(Number(decision.score || 0) * 100)}%` : "-"}</b></span>
      <span>最终采用：<b>${htmlEscape(sourceLabels[decision.finalSource] || decision.finalSource)}</b></span>
      <span>说明：<b>${htmlEscape(reasonLabels[decision.reason] || decision.reason)}</b></span>
      <span class="learning-normalized">标准化文本：${htmlEscape(decision.normalizedText || "-")}</span>
    `;
  }
  if (toggle) toggle.disabled = !enabled;
  if ($("rememberCorrectionNowBtn")) $("rememberCorrectionNowBtn").disabled = !enabled;
}

function openLearningLibrary() {
  renderLearningLibrary();
  const dialog = $("learningLibraryDialog");
  if (typeof dialog?.showModal === "function") dialog.showModal();
  else dialog?.setAttribute("open", "");
}

function closeLearningLibrary() {
  const dialog = $("learningLibraryDialog");
  if (typeof dialog?.close === "function") dialog.close();
  else dialog?.removeAttribute("open");
}

function toggleLearningEnabled() {
  const enabled = Boolean($("learningMasterSwitch")?.checked);
  saveLearningValue(LEARNING_SETTINGS_KEY, { enabled, updatedAt: new Date().toISOString() });
  if (!enabled) learningAppliedCaseId = null;
  renderLearningLibrary();
  if (enabled) syncRemoteLearningPackage();
  else parseOrders();
}

function toggleLearningCase(id) {
  const items = localLearningCases().map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item);
  saveLearningValue(LEARNING_CASES_KEY, items);
  renderLearningLibrary();
}

function deleteLearningCase(id) {
  if (!confirm("确认删除这条纠错案例？")) return;
  saveLearningValue(LEARNING_CASES_KEY, localLearningCases().filter((item) => item.id !== id));
  saveLearningValue(LEARNING_RULES_KEY, localLearningRules().map((rule) => ({ ...rule, sourceCaseIds: (rule.sourceCaseIds || []).filter((caseId) => caseId !== id) })));
  renderLearningLibrary();
}

function setLearningRuleStatus(id, status) {
  const items = localLearningRules().map((item) => item.id === id ? {
    ...item,
    status,
    enabled: status === "confirmed",
    confirmedAt: status === "confirmed" ? new Date().toISOString() : null
  } : item);
  saveLearningValue(LEARNING_RULES_KEY, items);
  renderLearningLibrary();
}

function toggleLearningRule(id) {
  saveLearningValue(LEARNING_RULES_KEY, localLearningRules().map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  renderLearningLibrary();
}

function deleteLearningRule(id) {
  if (!confirm("确认删除这条学习规则？")) return;
  saveLearningValue(LEARNING_RULES_KEY, localLearningRules().filter((item) => item.id !== id));
  renderLearningLibrary();
}

function remoteLearningSettings() {
  return loadJson(LEARNING_REMOTE_SETTINGS_KEY, { url: DEFAULT_LEARNING_PACKAGE_URL, channel: "test" });
}

function saveRemoteLearningSettingsFromControls() {
  const settings = {
    url: String($("learningRemoteUrl")?.value || "").trim(),
    channel: String($("learningRemoteChannel")?.value || "test").trim() || "test"
  };
  saveLearningValue(LEARNING_REMOTE_SETTINGS_KEY, settings);
  return settings;
}

function learningPackageVersion() {
  const date = new Date();
  const stamp = date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}.${stamp.slice(8)}`;
}

function buildPublishableLearningPackage(channel = "test") {
  const cases = localLearningCases().filter((item) => item.enabled !== false).map((item) => ({
    id: item.id,
    sourceText: `远程模板：${effectiveLearningTemplate(item).pattern}`,
    normalizedText: "",
    correctedResult: [],
    changedFields: item.changedFields || [],
    template: effectiveLearningTemplate(item),
    enabled: true,
    origin: "remote",
    createdAt: item.createdAt,
    hitCount: 0,
    lastUsedAt: null
  }));
  const rules = localLearningRules().filter((item) => item.status === "confirmed" && item.enabled).map((item) => ({
    ...item,
    origin: "remote",
    hitCount: 0,
    lastUsedAt: null
  }));
  return {
    schemaVersion: 1,
    packageType: "fortune-parser-learning",
    version: learningPackageVersion(),
    channel,
    enabled: true,
    generatedAt: new Date().toISOString(),
    containsRawOrders: false,
    cases,
    rules
  };
}

function validateLearningPackage(value) {
  if (!value || value.schemaVersion !== 1 || value.packageType !== "fortune-parser-learning") throw new Error("学习包格式不正确");
  if (!Array.isArray(value.cases) || !Array.isArray(value.rules)) throw new Error("学习包缺少案例或规则列表");
  value.cases.forEach((item) => {
    if (!item.id || !item.template?.pattern || !Array.isArray(item.template?.orders)) throw new Error("学习包包含无效模板");
  });
  value.rules.forEach((item) => {
    if (!item.id || item.status !== "confirmed") throw new Error("学习包包含未经确认的规则");
  });
  return value;
}

function installRemoteLearningPackage(value) {
  const packageValue = validateLearningPackage(value);
  saveLearningValue(LEARNING_REMOTE_PACKAGE_KEY, packageValue);
  return packageValue;
}

function exportLearningPackage() {
  const settings = saveRemoteLearningSettingsFromControls();
  const packageValue = buildPublishableLearningPackage(settings.channel);
  const blob = new Blob([JSON.stringify(packageValue, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `parser-learning-${packageValue.channel}-${packageValue.version}.json`;
  link.click();
  URL.revokeObjectURL(url);
  if ($("learningRemoteStatus")) $("learningRemoteStatus").textContent = `已导出 ${packageValue.version}，不包含原始注单`;
}

async function importLearningPackage(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const installed = installRemoteLearningPackage(JSON.parse(await file.text()));
    if ($("learningRemoteStatus")) $("learningRemoteStatus").textContent = `已安装学习包 ${installed.version}`;
    renderLearningLibrary();
  } catch (error) {
    if ($("learningRemoteStatus")) $("learningRemoteStatus").textContent = error.message || "学习包导入失败";
  } finally {
    input.value = "";
  }
}

function remoteLearningUrl(settings) {
  const separator = settings.url.includes("?") ? "&" : "?";
  return `${settings.url}${separator}channel=${encodeURIComponent(settings.channel)}`;
}

async function syncRemoteLearningPackage() {
  const settings = saveRemoteLearningSettingsFromControls();
  if (!settings.url) {
    $("learningRemoteStatus").textContent = "请先填写远程学习包地址";
    return;
  }
  $("learningRemoteStatus").textContent = "正在同步测试通道...";
  try {
    const response = await fetchWithTimeout(remoteLearningUrl(settings), { cache: "no-store" }, 15000);
    if (!response.ok) throw new Error(`同步失败（${response.status}）`);
    const installed = installRemoteLearningPackage(await response.json());
    $("learningRemoteStatus").textContent = `同步成功：${installed.version}`;
    renderLearningLibrary();
    parseOrders();
  } catch (error) {
    $("learningRemoteStatus").textContent = `${error.message || "同步失败"}；继续使用本机已有规则`;
  }
}

async function publishLearningPackage() {
  const settings = saveRemoteLearningSettingsFromControls();
  const publishKey = String($("learningPublishKey")?.value || "").trim();
  if (!settings.url || !publishKey) {
    $("learningRemoteStatus").textContent = "发布需要远程地址和临时发布密钥";
    return;
  }
  const packageValue = buildPublishableLearningPackage(settings.channel);
  $("learningRemoteStatus").textContent = `正在发布 ${packageValue.version}...`;
  try {
    const response = await fetchWithTimeout(remoteLearningUrl(settings), {
      method: "POST",
      headers: { "content-type": "application/json", "x-parser-learning-publish-key": publishKey },
      body: JSON.stringify(packageValue)
    }, 15000);
    if (!response.ok) throw new Error(`发布失败（${response.status}）`);
    $("learningPublishKey").value = "";
    $("learningRemoteStatus").textContent = `已发布到${settings.channel === "stable" ? "正式" : "测试"}通道：${packageValue.version}`;
  } catch (error) {
    $("learningRemoteStatus").textContent = error.message || "发布失败";
  }
}

function renderLearningLibrary() {
  const settings = learningSettings();
  if ($("learningMasterSwitch")) $("learningMasterSwitch").checked = Boolean(settings.enabled);
  const cases = learningCases();
  const rules = learningRules();
  const conflicts = learningConflicts();
  const remoteSettings = remoteLearningSettings();
  const remotePackage = loadJson(LEARNING_REMOTE_PACKAGE_KEY, null);
  if ($("learningRemoteUrl")) $("learningRemoteUrl").value = remoteSettings.url || "";
  if ($("learningRemoteChannel")) $("learningRemoteChannel").value = remoteSettings.channel || "test";
  if ($("learningInstalledVersion")) $("learningInstalledVersion").textContent = remotePackage?.version || "尚未安装远程包";
  if ($("learningCaseRows")) $("learningCaseRows").innerHTML = cases.length ? cases.map((item) => `
    <tr><td><pre>${htmlEscape(item.sourceText)}</pre><small>模板：${htmlEscape(effectiveLearningTemplate(item).pattern)}</small></td><td><pre>${htmlEscape(JSON.stringify(item.originalResult, null, 2))}</pre></td><td><pre>${htmlEscape(JSON.stringify(item.correctedResult, null, 2))}</pre></td><td>${item.changedFields.map((field) => htmlEscape(field.field)).join("、")}</td><td>${new Date(item.createdAt).toLocaleString()}</td><td>${item.hitCount || 0}<br><small>模板 ${item.templateHitCount || 0} 次</small><br><small>${item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "未使用"}</small></td><td><button type="button" onclick="FortuneApp.toggleLearningCase('${item.id}')">${item.enabled ? "停用" : "启用"}</button><button class="danger" type="button" onclick="FortuneApp.deleteLearningCase('${item.id}')">删除</button></td></tr>
  `).join("") : '<tr><td colspan="7">暂无人工纠错案例</td></tr>';
  if ($("learningRuleRows")) $("learningRuleRows").innerHTML = rules.length ? rules.map((item) => `
    <tr><td>${htmlEscape(item.name)}</td><td>${item.status}</td><td>${(item.sourceCaseIds || []).length}</td><td>${item.hitCount || 0}<br><small>${item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "未使用"}</small></td><td>${item.status === "pending" ? `<button type="button" onclick="FortuneApp.setLearningRuleStatus('${item.id}','confirmed')">确认规则</button><button type="button" onclick="FortuneApp.setLearningRuleStatus('${item.id}','rejected')">拒绝</button>` : `<button type="button" onclick="FortuneApp.toggleLearningRule('${item.id}')">${item.enabled ? "停用" : "启用"}</button>`}<button class="danger" type="button" onclick="FortuneApp.deleteLearningRule('${item.id}')">删除</button></td></tr>
  `).join("") : '<tr><td colspan="5">暂无候选规则</td></tr>';
  if ($("learningConflictRows")) $("learningConflictRows").innerHTML = conflicts.length ? conflicts.map((item) => `
    <tr><td>${new Date(item.createdAt).toLocaleString()}</td><td>${htmlEscape(item.kind)}</td><td><pre>${htmlEscape(item.sourceText)}</pre></td></tr>
  `).join("") : '<tr><td colspan="3">暂无冲突</td></tr>';
  renderLearningEntryStatus();
}

function bindDrawBlessingVideo() {
  const video = $("drawBlessingVideo");
  if (!video) return;
  playDrawBlessingOnce();
  video.addEventListener("ended", () => {
    video.pause();
  });
}
populateDefaultTypeSelect();
bindControls();
bindDrawBlessingVideo();
on("riskRegion", "change", changeRiskRegion);
on("adjustOdds", "input", updateReportSettingsFromInput);
on("adjustRebate", "input", updateReportSettingsFromInput);
on("drawRegion", "change", renderCustomerSettlement);
on("smartRiskLimitBtn", "click", applySmartRiskLimit);
on("riskLimit", "input", updateRiskLimitFromInput);
on("orderSearch", "input", renderOrders);

const customerCleanup = sanitizeCustomers(customers);
if (customerCleanup.changed) {
  customers = customerCleanup.items;
  safeStorageSet(CUSTOMER_KEY, JSON.stringify(customers));
  saveDataBackup();
}

if ($("riskLimit") && $("riskRegion")) {
  $("riskLimit").value = money(riskLimitForRegion($("riskRegion").value));
  applyReportSettingsToControls($("riskRegion").value);
}
on("orderInput", "input", resizeOrderInput);
runSafe(resizeOrderInput);
runSafe(initLicenseGate);
runSafe(renderAll);
runSafe(renderLearningLibrary);
if (learningSettings().enabled) syncRemoteLearningPackage().catch(() => {});
syncAiExamplesWithBridge().catch(() => {});
})();
