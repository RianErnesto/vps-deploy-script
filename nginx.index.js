const { Client } = require("ssh2");
const path = require("path");
const { env } = require("./config/env.config");
const { getPrivateKey } = require("./utils/ssh.utils");
const { processTemplate } = require("./utils/templates.utils");
const { question, close } = require("./libs/readline/utils");

async function main() {
  try {
    console.log("NGINX Automatic Configuration Script...");

    const privateKey = await getPrivateKey();

    const clientName = await question("Type client's name: ");
    const domain = await question("Type domain: ");
    const port = await question("Type port: ");

    console.log("Connecting to the server...");

    // Process the template with the provided variables
    const templatePath = path.join(
      __dirname,
      "templates",
      "nginx.config.template"
    );
    const configNginx = processTemplate(templatePath, {
      domain,
      port,
    });

    const conn = new Client();

    conn.on("ready", async () => {
      console.log("SSH Connection established successfully!");

      console.log("\nCreating Nginx configuration file");

      const executeCommand = (command) => {
        return new Promise((resolve, reject) => {
          conn.exec(command, (err, stream) => {
            if (err) return reject(err);

            let output = "";
            stream.on("data", (data) => {
              output += data.toString();
              process.stdout.write(data);
            });

            stream.stderr.on("data", (data) => {
              process.stderr.write(data);
            });

            stream.on("close", (code) => {
              if (code !== 0) {
                reject(new Error(`Command failed with code: ${code}`));
              } else {
                resolve(output);
              }
            });
          });
        });
      };

      try {
        await executeCommand(
          `echo "${configNginx}" | sudo tee /etc/nginx/sites-available/${clientName}`
        );
        console.log(
          `\nConfiguration file created: /etc/nginx/sites-available/${clientName}`
        );

        await executeCommand(
          `sudo ln -s /etc/nginx/sites-available/${clientName} /etc/nginx/sites-enabled`
        );
        console.log("\nSymbolic link created with success");

        await executeCommand("sudo nginx -t");
        console.log("\nNginx configuration test passed successfully");

        await executeCommand("sudo systemctl restart nginx");
        console.log("\nNginx restarted successfully");

        console.log("\n===Process finished successfully===");
      } catch (error) {
        console.error(
          "\nError executing command in the server: ",
          error.message
        );
      } finally {
        conn.end();
      }

      close();
    });

    conn.on("error", (err) => {
      console.error("SSH Connection error: ", err.message);
      close();
    });

    conn.connect({
      host: env.SERVER_IP_ADDRESS,
      port: 22,
      username: env.USER_SSH,
      privateKey,
      passphrase: env.SSH_PASSPHRASE,
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
