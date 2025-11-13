var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-nfDkx5/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/game-session.ts
var GameSession = class {
  state = null;
  websockets = /* @__PURE__ */ new Map();
  storage;
  id;
  env;
  constructor(ctx, env2) {
    this.storage = ctx.storage;
    this.id = ctx.id;
    this.env = env2;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    if (path.endsWith("/initialize") && request.method === "POST") {
      return this.initialize(request);
    }
    if (path.endsWith("/state")) {
      return this.getState();
    }
    if (path.endsWith("/join") && request.method === "POST") {
      return this.joinGame(request);
    }
    if (path.endsWith("/action") && request.method === "POST") {
      return this.handlePlayerAction(request);
    }
    if (path.endsWith("/dm-action") && request.method === "POST") {
      return this.handleDMAction(request);
    }
    if (path.endsWith("/start") && request.method === "POST") {
      return this.startGame(request);
    }
    return new Response("Not Found", { status: 404 });
  }
  async initialize(request) {
    const body = await request.json();
    const { inviteCode, hostId, quest, world, startingArea } = body;
    const sessionId = this.id.toString();
    const now = Date.now();
    this.state = {
      id: sessionId,
      inviteCode,
      hostId,
      questId: quest.id,
      quest,
      players: [],
      gameState: null,
      status: "waiting",
      createdAt: now,
      lastUpdated: now
    };
    await this.persistState();
    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        inviteCode
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  async getState() {
    await this.loadState();
    if (!this.state) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const response = {
      sessionId: this.state.id,
      inviteCode: this.state.inviteCode,
      status: this.state.status,
      hostId: this.state.hostId,
      quest: this.state.quest,
      players: this.state.players,
      createdAt: this.state.createdAt
    };
    if (this.state.gameState) {
      response.gameState = this.state.gameState;
    }
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async joinGame(request) {
    await this.loadState();
    if (!this.state) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (this.state.status !== "waiting") {
      return new Response(
        JSON.stringify({ error: "Game has already started" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const { character, playerId } = body;
    if (this.state.players.some((p) => p.playerId === playerId)) {
      return new Response(JSON.stringify({ error: "Player already joined" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const playerInfo = {
      characterId: character.id,
      playerId,
      name: character.name,
      joinedAt: Date.now()
    };
    this.state.players.push(playerInfo);
    this.state.lastUpdated = Date.now();
    if (this.state.players.length === 1 && !this.state.gameState) {
    }
    await this.persistState();
    this.broadcast({
      type: "player_joined",
      timestamp: Date.now(),
      data: {
        playerId,
        characterId: character.id,
        character
      }
    });
    return new Response(
      JSON.stringify({
        success: true,
        playerInfo,
        session: {
          sessionId: this.state.id,
          inviteCode: this.state.inviteCode,
          status: this.state.status,
          players: this.state.players
        }
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  async startGame(request) {
    await this.loadState();
    if (!this.state) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    const { hostId, gameState } = body;
    if (hostId !== this.state.hostId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (this.state.status !== "waiting") {
      return new Response(JSON.stringify({ error: "Game already started" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const multiplayerState = {
      ...gameState,
      sessionId: this.state.id,
      inviteCode: this.state.inviteCode,
      hostId: this.state.hostId,
      quest: this.state.quest,
      players: this.state.players,
      status: "active",
      createdAt: this.state.createdAt,
      lastUpdated: Date.now(),
      messages: []
    };
    this.state.gameState = multiplayerState;
    this.state.status = "active";
    this.state.lastUpdated = Date.now();
    await this.persistState();
    this.broadcast({
      type: "game_state_update",
      timestamp: Date.now(),
      data: { gameState: multiplayerState }
    });
    return new Response(
      JSON.stringify({
        success: true,
        gameState: multiplayerState
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  async handlePlayerAction(request) {
    await this.loadState();
    if (!this.state || !this.state.gameState) {
      return new Response(JSON.stringify({ error: "Game not active" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    const { action, characterId, playerId } = body;
    const player = this.state.players.find((p) => p.playerId === playerId);
    if (!player || player.characterId !== characterId) {
      return new Response(JSON.stringify({ error: "Invalid player" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    this.broadcast({
      type: "player_action",
      timestamp: Date.now(),
      data: {
        playerId,
        characterId,
        action
      }
    });
    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  async handleDMAction(request) {
    await this.loadState();
    if (!this.state || !this.state.gameState) {
      return new Response(JSON.stringify({ error: "Game not active" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    const { hostId, type, data } = body;
    if (hostId !== this.state.hostId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (type === "narrate") {
      const message = {
        id: `msg_${Date.now()}`,
        content: data.content,
        timestamp: Date.now(),
        type: "narration",
        speaker: "Dungeon Master"
      };
      this.state.gameState.messages.push(message);
    } else if (type === "update_character") {
      const character = this.state.gameState.characters.find(
        (c) => c.id === data.characterId
      );
      if (character) {
        Object.assign(character, data.updates);
      }
    } else if (type === "advance_story") {
      if (data.message) {
        const message = {
          id: `msg_${Date.now()}`,
          content: data.message,
          timestamp: Date.now(),
          type: "narration",
          speaker: "Dungeon Master"
        };
        this.state.gameState.messages.push(message);
      }
    }
    this.state.gameState.lastUpdated = Date.now();
    this.state.lastUpdated = Date.now();
    await this.persistState();
    this.broadcast({
      type: "game_state_update",
      timestamp: Date.now(),
      data: { gameState: this.state.gameState }
    });
    return new Response(
      JSON.stringify({
        success: true,
        gameState: this.state.gameState
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  async handleWebSocket(request) {
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const characterId = url.searchParams.get("characterId");
    if (!playerId || !characterId) {
      return new Response("Missing playerId or characterId", { status: 400 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const connection = {
      playerId,
      characterId,
      ws: server
    };
    this.websockets.set(playerId, connection);
    server.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "ping") {
          server.send(
            JSON.stringify({
              type: "pong",
              timestamp: Date.now()
            })
          );
        }
      } catch (error3) {
        console.error("WebSocket message error:", error3);
      }
    });
    server.addEventListener("close", () => {
      this.websockets.delete(playerId);
      this.broadcast({
        type: "player_left",
        timestamp: Date.now(),
        data: { playerId, characterId }
      });
    });
    await this.loadState();
    if (this.state?.gameState) {
      server.send(
        JSON.stringify({
          type: "game_state_update",
          timestamp: Date.now(),
          data: { gameState: this.state.gameState }
        })
      );
    }
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    for (const [playerId, connection] of this.websockets.entries()) {
      try {
        connection.ws.send(messageStr);
      } catch (error3) {
        console.error(`Error broadcasting to ${playerId}:`, error3);
        this.websockets.delete(playerId);
      }
    }
  }
  async loadState() {
    if (this.state)
      return;
    const stored = await this.storage.get("state");
    if (stored) {
      this.state = stored;
    }
  }
  async persistState() {
    if (this.state) {
      await this.storage.put("state", this.state);
    }
  }
};
__name(GameSession, "GameSession");

// src/session-manager.ts
function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
__name(generateInviteCode, "generateInviteCode");
function getSessionId(env2, inviteCode) {
  return env2.GAME_SESSION.idFromName(inviteCode);
}
__name(getSessionId, "getSessionId");
function getSessionStub(env2, inviteCode) {
  const id = getSessionId(env2, inviteCode);
  return env2.GAME_SESSION.get(id);
}
__name(getSessionStub, "getSessionStub");

// src/middleware.ts
function isAdmin(email, env2) {
  if (!email)
    return false;
  const adminEmails = env2.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}
__name(isAdmin, "isAdmin");
function getEmailFromRequest(request) {
  return request.headers.get("X-User-Email");
}
__name(getEmailFromRequest, "getEmailFromRequest");
async function requireAdmin(request, env2) {
  const email = getEmailFromRequest(request);
  if (!isAdmin(email, env2)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized - Admin access required" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  return null;
}
__name(requireAdmin, "requireAdmin");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Email",
    "Content-Type": "application/json"
  };
}
__name(corsHeaders, "corsHeaders");
function handleCORS(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }
  return null;
}
__name(handleCORS, "handleCORS");

// src/db.ts
var Database = class {
  constructor(db) {
    this.db = db;
  }
  // Game operations
  async createGame(game) {
    const now = Date.now();
    await this.db.prepare(
      `INSERT INTO games (id, invite_code, host_id, host_email, quest_id, quest_data, world, starting_area, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      game.id,
      game.invite_code,
      game.host_id,
      game.host_email || null,
      game.quest_id,
      game.quest_data,
      game.world,
      game.starting_area,
      game.status,
      now,
      now
    ).run();
  }
  async getGameByInviteCode(inviteCode) {
    const result = await this.db.prepare(
      "SELECT * FROM games WHERE invite_code = ?"
    ).bind(inviteCode).first();
    return result || null;
  }
  async updateGameStatus(gameId, status) {
    await this.db.prepare(
      "UPDATE games SET status = ?, updated_at = ? WHERE id = ?"
    ).bind(status, Date.now(), gameId).run();
  }
  // Character operations
  async createCharacter(character) {
    const now = Date.now();
    await this.db.prepare(
      `INSERT INTO characters (id, player_id, player_email, name, level, race, class, description, stats, skills, inventory, equipped, health, max_health, action_points, max_action_points, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      character.id,
      character.player_id,
      character.player_email || null,
      character.name,
      character.level,
      character.race,
      character.class,
      character.description || null,
      character.stats,
      character.skills,
      character.equipped,
      character.health,
      character.max_health,
      character.action_points,
      character.max_action_points,
      now,
      now
    ).run();
  }
  async getCharacterById(characterId) {
    const result = await this.db.prepare(
      "SELECT * FROM characters WHERE id = ?"
    ).bind(characterId).first();
    return result || null;
  }
  async getCharactersByPlayerId(playerId) {
    const result = await this.db.prepare(
      "SELECT * FROM characters WHERE player_id = ? ORDER BY updated_at DESC"
    ).bind(playerId).all();
    return result.results || [];
  }
  async getCharactersByEmail(email) {
    const result = await this.db.prepare(
      "SELECT * FROM characters WHERE player_email = ? ORDER BY updated_at DESC"
    ).bind(email).all();
    return result.results || [];
  }
  async updateCharacter(characterId, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "id" && value !== void 0) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0)
      return;
    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(characterId);
    await this.db.prepare(
      `UPDATE characters SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...values).run();
  }
  // Game player operations
  async addPlayerToGame(player) {
    const id = `gp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await this.db.prepare(
      `INSERT INTO game_players (id, game_id, player_id, player_email, character_id, character_name, joined_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      player.game_id,
      player.player_id,
      player.player_email || null,
      player.character_id,
      player.character_name,
      player.joined_at
    ).run();
    return id;
  }
  async getGamePlayers(gameId) {
    const result = await this.db.prepare(
      "SELECT * FROM game_players WHERE game_id = ? ORDER BY joined_at ASC"
    ).bind(gameId).all();
    return result.results || [];
  }
  // Game state operations
  async saveGameState(gameId, stateData) {
    await this.db.prepare(
      `INSERT INTO game_states (game_id, state_data, updated_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(game_id) DO UPDATE SET state_data = ?, updated_at = ?`
    ).bind(gameId, stateData, Date.now(), stateData, Date.now()).run();
  }
  async getGameState(gameId) {
    const result = await this.db.prepare(
      "SELECT * FROM game_states WHERE game_id = ?"
    ).bind(gameId).first();
    return result || null;
  }
};
__name(Database, "Database");

// src/routes.ts
async function handleRequest(request, env2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const url = new URL(request.url);
  const path = url.pathname;
  try {
    if (path.startsWith("/api/games")) {
      return handleGameRoutes(request, env2, path);
    }
    if (path.startsWith("/api/quests")) {
      return handleQuestRoutes(request, env2, path);
    }
    if (path.startsWith("/api/admin")) {
      return handleAdminRoutes(request, env2, path);
    }
    if (path === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: corsHeaders()
      });
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  } catch (error3) {
    console.error("Request error:", error3);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error3 instanceof Error ? error3.message : "Unknown error"
      }),
      {
        status: 500,
        headers: corsHeaders()
      }
    );
  }
}
__name(handleRequest, "handleRequest");
async function handleGameRoutes(request, env2, path) {
  if (path === "/api/games" && request.method === "POST") {
    const body = await request.json();
    const { questId, quest, world, startingArea, hostId, hostEmail, hostCharacter } = body;
    const db = new Database(env2.DB);
    let questData;
    if (quest) {
      questData = quest;
    } else if (questId) {
      const kvQuestData = await env2.QUESTS.get(questId);
      if (!kvQuestData) {
        return new Response(
          JSON.stringify({ error: "Quest not found. Please provide quest data in the request body." }),
          {
            status: 404,
            headers: corsHeaders()
          }
        );
      }
      questData = JSON.parse(kvQuestData);
    } else {
      return new Response(
        JSON.stringify({ error: "Quest ID or quest data is required" }),
        {
          status: 400,
          headers: corsHeaders()
        }
      );
    }
    const inviteCode = generateInviteCode();
    const sessionStub = getSessionStub(env2, inviteCode);
    const requestUrl = new URL(request.url);
    const baseOrigin = requestUrl.origin;
    const initRequest = new Request(`${baseOrigin}/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode,
        hostId,
        quest: questData,
        world,
        startingArea
      })
    });
    const initResponse = await sessionStub.fetch(initRequest);
    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("Failed to initialize session:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to initialize game session", details: errorText }),
        {
          status: 500,
          headers: corsHeaders()
        }
      );
    }
    const gameId = sessionStub.id.toString();
    await db.createGame({
      id: gameId,
      invite_code: inviteCode,
      host_id: hostId,
      host_email: hostEmail || null,
      quest_id: questData.id,
      quest_data: JSON.stringify(questData),
      world,
      starting_area: startingArea,
      status: "waiting"
    });
    if (hostCharacter) {
      await db.createCharacter({
        id: hostCharacter.id,
        player_id: hostId,
        player_email: hostEmail || null,
        name: hostCharacter.name,
        level: hostCharacter.level,
        race: hostCharacter.race,
        class: hostCharacter.class,
        description: hostCharacter.description || null,
        stats: JSON.stringify(hostCharacter.stats),
        skills: JSON.stringify(hostCharacter.skills || []),
        inventory: JSON.stringify(hostCharacter.inventory || []),
        equipped: JSON.stringify(hostCharacter.equipped || {}),
        health: hostCharacter.health,
        max_health: hostCharacter.maxHealth,
        action_points: hostCharacter.actionPoints,
        max_action_points: hostCharacter.maxActionPoints
      });
      await db.addPlayerToGame({
        game_id: gameId,
        player_id: hostId,
        player_email: hostEmail || null,
        character_id: hostCharacter.id,
        character_name: hostCharacter.name,
        joined_at: Date.now()
      });
      await sessionStub.fetch(
        new Request(`${baseOrigin}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: hostCharacter,
            playerId: hostId
          })
        })
      );
    }
    const sessionResponse = await sessionStub.fetch(
      new Request(`${baseOrigin}/state`)
    );
    const sessionData = await sessionResponse.json();
    return new Response(JSON.stringify(sessionData), {
      headers: corsHeaders()
    });
  }
  const pathParts = path.split("/");
  const inviteCodeIndex = pathParts.indexOf("games") + 1;
  if (inviteCodeIndex < pathParts.length) {
    const inviteCode = pathParts[inviteCodeIndex];
    const sessionStub = getSessionStub(env2, inviteCode);
    if (path === `/api/games/${inviteCode}` && request.method === "GET") {
      const response = await sessionStub.fetch(
        new Request(`${request.url}/state`)
      );
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: corsHeaders()
      });
    }
    if (path === `/api/games/${inviteCode}/join` && request.method === "POST") {
      const body = await request.json();
      const { character, playerId, playerEmail } = body;
      const db = new Database(env2.DB);
      const game = await db.getGameByInviteCode(inviteCode);
      if (!game) {
        return new Response(
          JSON.stringify({ error: "Game not found" }),
          { status: 404, headers: corsHeaders() }
        );
      }
      await db.createCharacter({
        id: character.id,
        player_id: playerId,
        player_email: playerEmail || null,
        name: character.name,
        level: character.level,
        race: character.race,
        class: character.class,
        description: character.description || null,
        stats: JSON.stringify(character.stats),
        skills: JSON.stringify(character.skills || []),
        inventory: JSON.stringify(character.inventory || []),
        equipped: JSON.stringify(character.equipped || {}),
        health: character.health,
        max_health: character.maxHealth,
        action_points: character.actionPoints,
        max_action_points: character.maxActionPoints
      });
      await db.addPlayerToGame({
        game_id: game.id,
        player_id: playerId,
        player_email: playerEmail || null,
        character_id: character.id,
        character_name: character.name,
        joined_at: Date.now()
      });
      const url = new URL(request.url);
      const doRequest = new Request(`${url.origin}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character, playerId })
      });
      const response = await sessionStub.fetch(doRequest);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: corsHeaders()
      });
    }
    if (path === `/api/games/${inviteCode}/state` && request.method === "GET") {
      const url = new URL(request.url);
      const response = await sessionStub.fetch(
        new Request(`${url.origin}/state`)
      );
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: corsHeaders()
      });
    }
    if (path === `/api/games/${inviteCode}/action` && request.method === "POST") {
      const response = await sessionStub.fetch(request);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: corsHeaders()
      });
    }
    if (path === `/api/games/${inviteCode}/dm-action` && request.method === "POST") {
      const response = await sessionStub.fetch(request);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: corsHeaders()
      });
    }
    if (path === `/api/games/${inviteCode}/start` && request.method === "POST") {
      const response = await sessionStub.fetch(request);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: corsHeaders()
      });
    }
    if (path === `/api/games/${inviteCode}/ws`) {
      return sessionStub.fetch(request);
    }
  }
  return new Response("Not Found", { status: 404, headers: corsHeaders() });
}
__name(handleGameRoutes, "handleGameRoutes");
async function handleQuestRoutes(request, env2, path) {
  if (path === "/api/quests" && request.method === "GET") {
    const keys = await env2.QUESTS.list();
    const quests = [];
    for (const key of keys.keys) {
      const questData = await env2.QUESTS.get(key.name);
      if (questData) {
        quests.push(JSON.parse(questData));
      }
    }
    return new Response(JSON.stringify({ quests }), {
      headers: corsHeaders()
    });
  }
  if (path.startsWith("/api/quests/") && request.method === "GET") {
    const questId = path.split("/").pop();
    if (questId) {
      const questData = await env2.QUESTS.get(questId);
      if (questData) {
        return new Response(questData, {
          headers: corsHeaders()
        });
      }
    }
    return new Response(
      JSON.stringify({ error: "Quest not found" }),
      {
        status: 404,
        headers: corsHeaders()
      }
    );
  }
  return new Response("Not Found", { status: 404, headers: corsHeaders() });
}
__name(handleQuestRoutes, "handleQuestRoutes");
async function handleAdminRoutes(request, env2, path) {
  const adminCheck = await requireAdmin(request, env2);
  if (adminCheck)
    return adminCheck;
  if (path === "/api/admin/quests" && request.method === "POST") {
    const body = await request.json();
    const quest = {
      ...body,
      id: body.id || `quest_${Date.now()}`,
      createdAt: Date.now(),
      createdBy: getEmailFromRequest2(request) || "admin"
    };
    await env2.QUESTS.put(quest.id, JSON.stringify(quest));
    return new Response(JSON.stringify(quest), {
      headers: corsHeaders()
    });
  }
  if (path.startsWith("/api/admin/games/") && request.method === "DELETE") {
    const gameId = path.split("/").pop();
    if (gameId) {
      return new Response(
        JSON.stringify({ success: true, message: "Game deletion not yet implemented" }),
        {
          headers: corsHeaders()
        }
      );
    }
  }
  return new Response("Not Found", { status: 404, headers: corsHeaders() });
}
__name(handleAdminRoutes, "handleAdminRoutes");
function getEmailFromRequest2(request) {
  return request.headers.get("X-User-Email");
}
__name(getEmailFromRequest2, "getEmailFromRequest");

// src/index.ts
var src_default = {
  async fetch(request, env2) {
    return handleRequest(request, env2);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-nfDkx5/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-nfDkx5/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  GameSession,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
