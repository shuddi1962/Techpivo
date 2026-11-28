const fs = require("fs");
const path = require("path");
const https = require("https");

const REF = "byjuwncufhoytbvobmwl";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const migrationsDir = path.join(__dirname, "..", "supabase/migrations");

function getMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readMigration(file) {
  return fs.readFileSync(path.join(migrationsDir, file), "utf8");
}

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        port: 443,
        path: `/v1/projects/${REF}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const files = getMigrationFiles();
  console.log(`Found ${files.length} migration files\n`);

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const file of files) {
    const sql = readMigration(file);

    try {
      const result = await runSql(sql);
      if (result.status >= 200 && result.status < 300) {
        console.log(`  OK   ${file}`);
        successCount++;
        results.push({ file, status: "ok", error: null });
      } else {
        const errMsg = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
        console.log(`  FAIL ${file} (${result.status}): ${errMsg.slice(0, 120)}`);
        failCount++;
        results.push({ file, status: "fail", error: errMsg });
      }
    } catch (err) {
      console.log(`  ERR  ${file}: ${err.message.slice(0, 120)}`);
      failCount++;
      results.push({ file, status: "error", error: err.message });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Success: ${successCount}/${files.length}`);
  console.log(`Failed: ${failCount}/${files.length}`);

  if (failCount > 0) {
    console.log("\nFailed migrations:");
    results.filter((r) => r.status !== "ok").forEach((r) => {
      console.log(`  ${r.file}: ${r.error.slice(0, 100)}`);
    });
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
