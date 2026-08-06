const fs = require("fs");

const text = fs.readFileSync("prisma/schema.prisma", "utf8");

// Remove BOM caso exista
const clean = text.replace(/^\uFEFF/, "");

fs.writeFileSync("prisma/schema.prisma", clean, {
  encoding: "utf8",
});

console.log("schema.prisma salvo em UTF-8 sem BOM.");
