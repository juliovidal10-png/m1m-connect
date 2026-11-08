const fs = require("node:fs");
const path = require("node:path");

const marker = "// M1M: acknowledge top-level status nodes through the existing queue.";
const handlerAnchor = "    const makeOfflineNodeProcessor = () => {";
const mapAnchor = "            ['notification', handleNotification]\n";
const listenerAnchor = "    ws.on('CB:message', async (node) => {";
const handler = `    ${marker}
    const handleStatus = async (node) => {
        try {
            await sendMessageAck(node);
        }
        catch (error) {
            onUnexpectedError(error, 'acking status stanza');
        }
    };
`;
const listener = `    ws.on('CB:status', async (node) => {
        await processNode('status', node, 'acking status stanza', handleStatus);
    });
`;

function replaceOnce(source, anchor, replacement) {
  if (source.split(anchor).length !== 2) {
    throw new Error("Formato do Baileys incompatível com a correção.");
  }
  return source.replace(anchor, replacement);
}

function patch(source) {
  if (source.includes(marker)) {
    if (!source.includes(handler) || !source.includes(listener) ||
        !source.includes("            ['status', handleStatus]\n")) {
      throw new Error("Correção de status incompleta.");
    }
    return source;
  }
  if (/CB:status|const handleStatus\s*=/.test(source)) {
    throw new Error("O código já possui tratamento de status. Revisão necessária.");
  }
  let updated = replaceOnce(source, handlerAnchor, handler + handlerAnchor);
  updated = replaceOnce(updated, mapAnchor,
    "            ['notification', handleNotification],\n            ['status', handleStatus]\n");
  return replaceOnce(updated, listenerAnchor, listener + listenerAnchor);
}

function main() {
  const mode = process.argv[2];
  if (mode && mode !== "--check") throw new Error("Argumento inválido.");
  const entry = require.resolve("baileys", { paths: [process.cwd()] });
  const root = path.resolve(path.dirname(entry), "..");
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  if (version !== "7.0.0-rc.9") throw new Error("Versão do Baileys fora do escopo.");
  const target = path.join(path.dirname(entry), "Socket", "messages-recv.js");
  const original = fs.readFileSync(target, "utf8");
  const updated = patch(original);
  if (mode === "--check") {
    console.log(JSON.stringify({ baileys: version, correcao_presente: original === updated }));
    return;
  }
  if (original !== updated) {
    const temporary = target + ".m1m-status-ack.tmp";
    fs.writeFileSync(temporary, updated, { mode: fs.statSync(target).mode, flag: "wx" });
    fs.renameSync(temporary, target);
  }
  console.log(JSON.stringify({ baileys: version, correcao_presente: true }));
}

module.exports = { patch };
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
