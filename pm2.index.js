const { close, question } = require("./libs/readline/utils");
const { z } = require("zod");
const { connectSSH, executeCommand } = require("./utils/ssh.utils");

const NewAppSchema = z.object({
  name: z.string().min(1),
  startPort: z.number().int().positive().optional().nullable(),
  envVars: z.record(z.string()).optional(),
});

const config = {
  appsDir: "/var/www",
  ecosystemPath: "/var/www/ecosystem.config.js",
  portRange: {
    start: 3000,
    end: 4000,
  },
};

async function verifyEcosystemFileExistance(conn) {
  try {
    const checkFileCmd = `[ -f ${config.ecosystemPath} ] && echo "exists" || echo "doesnt exist"`;
    const fileExists =
      (await executeCommand(conn, checkFileCmd)).trim() === "exists";

    if (!fileExists) {
      const initEcosystem = `
            echo "module.exports = {
            apps: []
            };" > ${config.ecosystemPath}
        `;

      console.log("Ecosystem file not found. Creating it...");
      await executeCommand(conn, initEcosystem);
    }
  } catch (err) {
    console.error("Error verifying ecosystem file existence:", err);
    throw err;
  }
}

async function getUsedPorts(conn) {
  try {
    const catCmd = `cat ${config.ecosystemPath}`;
    const ecosystemContent = await executeCommand(conn, catCmd);

    const portRegex = /PORT: ['"]?(\d+)['"]?/g;
    const ports = [];
    let match;

    while ((match = portRegex.exec(ecosystemContent)) !== null) {
      ports.push(parseInt(match[1], 10));
    }

    return ports;
  } catch (err) {
    console.error("Error getting used ports:", err);
    return [];
  }
}

function findNextAvailablePort(usedPorts, startPort = null) {
  const { start, end } = config.portRange;
  const sortedPorts = [...usedPorts].sort((a, b) => a - b);

  if (
    startPort &&
    !usedPorts.included(startPort) &&
    startPort >= start &&
    startPort <= end
  ) {
    return startPort;
  }

  let port = start;
  while (port <= end) {
    if (!sortedPorts.includes(port)) {
      return port;
    }
    port++;
  }

  throw new Error(`No available ports found in range ${start}-${end}`);
}

async function getRemoteFile(conn, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);

      sftp.readFile(remotePath, "utf8", (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  });
}

async function putRemoteFile(conn, remotePath, content) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);

      sftp.writeFile(remotePath, content, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

async function updateEcosystem(conn, newApp, port) {
  const { name, envVars = {} } = newApp;

  try {
    // Make ecosystem file backup
    await executeCommand(
      conn,
      `cp ${config.ecosystemPath} ${config.ecosystemPath}.bak`
    );

    const ecosystemContent = await getRemoteFile(conn, config.ecosystemPath);

    const envVarsWithPort = { PORT: port, ...envVars };

    // Format environment variables to PM2 format
    const envString = Object.entries(envVarsWithPort)
      .map(([key, value]) => `      ${key}: "${value}"`)
      .join(",\n");

    const newAppConfig = `  {
    name: "${name}",
    script: "npm",
    args: "start",
    cwd: "${config.appsDir}/${name}",
    env: {
${envString}
    }
  }`;

    let updatedContent;

    if (ecosystemContent.includes("apps: [")) {
      // If there is an apps array with applications, verify if there is already an application in the array
      if (ecosystemContent.includes("apps: []")) {
        // Empty Array - Substitute empty brackets
        updatedContent = ecosystemContent.replace(
          "apps: []",
          `apps: [\n${newAppConfig}\n]`
        );
      } else {
        // Array with content - Add after the first bracket
        updatedContent = ecosystemContent.replace(
          "apps: [",
          `apps: [\n${newAppConfig},`
        );
      }
    } else {
      // Unknown format or empty - Create from scratch
      updatedContent = `module.exports = {
  apps: [
${newAppConfig}
  ]
};`;
    }

    await putRemoteFile(conn, config.ecosystemPath, updatedContent);

    console.log(
      `Ecosystem updated successfully for application ${name} on port ${port}`
    );
  } catch (error) {
    console.error("Error updating ecosystem:", error);
    // Restore backup in case of error
    await executeCommand(
      conn,
      `cp ${config.ecosystemPath}.bak ${config.ecosystemPath}`
    );
    throw error;
  }
}

// Not Working, try to fix it later - sed command is not working when using env variables
/* async function updateEcosystem(conn, newApp, port) {
  const { name, envVars = {} } = newApp;

  const envEntries = Object.entries({ PORT: port, ...envVars })
    .map(([key, value]) => `${key}: "${value}"`)
    .join(",\n");

  const updateCmd = `
    # Fazer backup do arquivo original
    cp ${config.ecosystemPath} ${config.ecosystemPath}.bak

    # Criar novo conteúdo com a aplicação adicionada
    sudo sed -i '/apps:/a \\
    {\\
      name: "${name}",\\
      script: "npm",\\
      args: "start",\\
      cwd: "${config.appsDir}/${name}",\\
      env: {\\
${envEntries}\\
      }\\
    },' ${config.ecosystemPath}
  `;

  try {
    await executeCommand(conn, updateCmd);
    console.log(
      `Ecosystem updated successfully for app ${name} on port ${port}`
    );
  } catch (err) {
    console.error("Error updating ecosystem:", err);
    // Restore backup if update fails
    await executeCommand(
      conn,
      `mv ${config.ecosystemPath}.bak ${config.ecosystemPath}`
    );
    throw err;
  }
} */

async function deployApp() {
  try {
    const name = await question("Enter the name of the application: ");
    const startPortStr = await question("Enter the starting port (optional): ");
    const startPort = startPortStr ? parseInt(startPortStr, 10) : null;

    console.log("\nEnvironment variables:");
    console.log("(Leave blank if you don't want to add any)");

    const envVars = {};
    let envKey = "";

    do {
      envKey = await question("Enter the key: ");
      if (envKey) {
        const envValue = await question("Enter the value: ");
        envVars[envKey] = envValue;
      }
    } while (envKey !== "");

    const newApp = NewAppSchema.parse({
      name,
      startPort,
      envVars,
    });

    console.log("\nConnecting to the server...");
    const conn = await connectSSH();

    try {
      console.log("Verifying ecosystem file existence...");
      await verifyEcosystemFileExistance(conn);

      console.log("Verifying used ports...");
      const usedPorts = await getUsedPorts(conn);
      console.log(`Ports in use: ${usedPorts.join(", ") || "None"}`);

      const port = findNextAvailablePort(usedPorts, newApp.startPort);
      console.log(`Selected port: ${port}`);

      await updateEcosystem(conn, newApp, port);

      //   To-Do: Start PM2 App
    } finally {
      conn.end();
    }
  } catch (err) {
    console.error("\nError deploying application:", err);
    if (err.errors) {
      console.err("Validation errors: ", err.errors);
    }
  } finally {
    close();
  }
}

deployApp();
