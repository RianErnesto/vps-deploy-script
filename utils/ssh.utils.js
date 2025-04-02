const path = require("path");
const { env } = require("../config/env.config");
const fs = require("fs");

async function getPrivateKey() {
  const privateKeyPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".ssh",
    env.SSH_PRIVATE_KEY
  );

  console.log("Private key path: ", privateKeyPath);

  if (!fs.existsSync(privateKeyPath)) {
    console.error("Error: SSH Key not found in ", privateKeyPath);
    rl.close();
    return;
  }

  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

  return privateKey;
}

module.exports = {
  getPrivateKey,
};
