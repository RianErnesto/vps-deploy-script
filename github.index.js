const { getPrivateKey } = require("./utils/ssh.utils");
const { env } = require("./config/env.config");
// Recommendation of GitHub
// https://docs.github.com/pt/rest/guides/encrypting-secrets-for-the-rest-api?apiVersion=2022-11-28
const sodium = require("libsodium-wrappers");
const { question, close } = require("./libs/readline/utils");

// https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#get-an-organization-public-key
async function getPublicKey(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get public key: ${response.statusText}`);
  }

  return response.json();
}

// https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#create-or-update-an-organization-secret
async function createSecret(owner, repo, secretName, secretValue, key_id, key) {
  // Initialize libsodium
  await sodium.ready;

  // Convert the secret and key to Uint8Array
  const messageBytes = Buffer.from(secretValue);
  const keyBytes = Buffer.from(key, "base64");

  // Encrypt the secret using libsodium
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
  const encrypted = Buffer.from(encryptedBytes).toString("base64");

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encrypted_value: encrypted,
        key_id: key_id,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create secret ${secretName}: ${response.statusText}`
    );
  }

  return response.json();
}

async function main() {
  try {
    const repositoryUrl = await question("Enter the Repository URL: ");
    const appId = await question("Enter the APP_ID: ");
    const appPath = await question("Enter the APP_PATH: ");
    const privateKey = await getPrivateKey();

    // Parse repository URL to get owner and repo
    const urlParts = repositoryUrl.replace(/\.git$/, "").split("/");
    const repo = urlParts.pop();
    const owner = urlParts.pop();

    console.log(`Creating secrets for ${owner}/${repo}...`);

    // Get the repository's public key for secret encryption
    const { key, key_id } = await getPublicKey(owner, repo);

    // Create all secrets
    const secrets = {
      APP_ID: appId,
      APP_PATH: appPath,
      SSH_PRIVATE_KEY: privateKey,
      USERNAME: env.USER_SSH,
      PASSPHRASE: env.SSH_PASSPHRASE || "",
      HOST: env.SERVER_IP_ADDRESS,
    };

    for (const [name, value] of Object.entries(secrets)) {
      console.log(`Creating secret: ${name}`);
      await createSecret(owner, repo, name, value, key_id, key);
      console.log(`Secret ${name} created successfully`);
    }

    console.log("All secrets created successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    close();
  }
}

main();
