const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { patch } = require("./patch-status-ack.cjs");

async function test(sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const patched = patch(source);
  assert.equal(patch(patched), patched);
  assert.throws(() => patch(source.replace("const makeOfflineNodeProcessor", "const unexpectedProcessor")));
  assert.throws(() => patch(source + "\nws.on('CB:status', () => {});"));

  const ackStart = patched.indexOf("    const sendMessageAck =");
  const ackEnd = patched.indexOf("    const rejectCall =", ackStart);
  const queueStart = patched.indexOf("    const processNodeWithBuffer =");
  const queueEnd = patched.indexOf("    ws.on('CB:ack,class:message'", queueStart);
  assert.ok(ackStart >= 0 && ackEnd > ackStart && queueStart >= 0 && queueEnd > queueStart);
  const handlers = new Map();
  const sent = [];
  const failures = [];
  const processed = [];
  let failNext = false;
  const context = {
    ws: { isOpen: true, on: (event, fn) => handlers.set(event, fn) },
    ev: { buffer() {}, flush() {} },
    logger: { debug() {} },
    sendNode: async node => {
      if (failNext) {
        failNext = false;
        throw new Error("synthetic write failure");
      }
      sent.push(JSON.parse(JSON.stringify(node)));
    },
    onUnexpectedError: (_, label) => failures.push(label),
    handleMessage: async node => processed.push(node.attrs.id),
    handleCall: async () => {},
    handleReceipt: async () => {},
    handleNotification: async () => {},
  };
  vm.runInNewContext(patched.slice(ackStart, ackEnd) + patched.slice(queueStart, queueEnd), context);
  const status = (id, offline) => ({
    tag: "status",
    attrs: { id, from: "fixture@s.whatsapp.net", type: "media",
      participant: "participant@s.whatsapp.net", recipient: "recipient@s.whatsapp.net",
      ...(offline ? { offline: "true" } : {}) },
  });
  const receiveStatus = handlers.get("CB:status");
  assert.equal(typeof receiveStatus, "function");
  await receiveStatus(status("live", false));
  await receiveStatus(status("offline", true));
  await new Promise(setImmediate);
  assert.deepEqual(sent.map(node => node.attrs.id), ["live", "offline"]);
  for (const node of sent) {
    assert.deepEqual(node, { tag: "ack", attrs: {
      id: node.attrs.id, to: "fixture@s.whatsapp.net", class: "status",
      participant: "participant@s.whatsapp.net", recipient: "recipient@s.whatsapp.net",
      type: "media",
    } });
  }

  failNext = true;
  await receiveStatus(status("failure", true));
  await handlers.get("CB:message")({ tag: "message", attrs: { id: "after-failure", offline: "true" } });
  await new Promise(setImmediate);
  assert.deepEqual(processed, ["after-failure"]);
  assert.deepEqual(failures, ["acking status stanza"]);
  console.log("PASS: status live/offline, ACK fields, queue after failure, repeated patch, incompatible source");
}

test(process.argv[2]).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
