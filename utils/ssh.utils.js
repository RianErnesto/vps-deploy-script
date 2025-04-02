const path = require("path");
const { env } = require("../config/env.config");
const fs = require("fs");
const { Client } = require("ssh2");

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

async function connectSSH() {
  const conn = new Client();
  const privateKey = await getPrivateKey();

  return new Promise((resolve, reject) => {
    conn
      .on("ready", () => {
        console.log("SSH Connection established successfully!");
        resolve(conn);
      })
      .on("error", (err) => {
        reject(new Error(`Error connecting to SSH: ${err.message}`));
      })
      .connect({
        host: env.SERVER_IP_ADDRESS,
        port: 22,
        username: env.USER_SSH,
        privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });
  });
}

async function executeCommand(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let stdout = "";
      let stderr = "";

      stream
        .on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(`Command failed with code: ${code}\nError: ${stderr}`)
            );
          } else {
            resolve(stdout);
          }
        })
        .on("data", (data) => {
          stdout += data.toString();
        })
        .stderr.on("data", (data) => {
          stderr += data.toString();
        });
    });
  });
}

module.exports = {
  getPrivateKey,
  connectSSH,
  executeCommand,
};
