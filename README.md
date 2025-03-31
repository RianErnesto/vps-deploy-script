# Nginx Configuration Script

This script automates the process of configuring Nginx on a remote server for reverse proxy setup. It allows you to easily create Nginx configurations for different domains and ports, making it perfect for managing multiple web applications on the same server.

## Features

- Interactive command-line interface
- Secure SSH connection using private key authentication
- Automatic Nginx configuration file creation
- Support for WebSocket connections
- Automatic Nginx configuration testing and restart
- Support for both HTTP and HTTPS (port 80)
- Template-based configuration for easy customization

## Prerequisites

- Node.js installed on your local machine
- SSH access to the target server
- Nginx installed on the target server
- Sudo privileges on the target server
- SSH private key for authentication

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file and configure it:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your server details:

```env
SERVER_IP_ADDRESS="your_server_ip"
USER_SSH="your_ssh_username"
SSH_PRIVATE_KEY="your_private_key_name"
# Optional: SSH_PASSPHRASE="your_key_passphrase"
```

Make sure your SSH private key is located in the `~/.ssh/` directory.

## Usage

1. Run the script using npm:

```bash
npm start
```

2. Follow the interactive prompts:
   - Confirm server access
   - Enter client name (used for the configuration filename)
   - Enter domain name
   - Enter port number where your application is running

The script will:

1. Connect to your server via SSH
2. Create a new Nginx configuration file
3. Create a symbolic link in the sites-enabled directory
4. Test the Nginx configuration
5. Restart Nginx to apply the changes

## Customizing the Nginx Configuration

The Nginx configuration is now template-based, making it easier to modify. The template file is located at `templates/nginx.config.template`. You can modify this file to change the default configuration.

Available template variables:

- `{{domain}}`: The domain name for the site
- `{{port}}`: The port number where your application is running

Example of modifying the template:

```nginx
server {
    listen 80;
    server_name {{domain}} www.{{domain}};
    location / {
        proxy_pass http://localhost:{{port}};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Dependencies

The project uses the following main dependencies:

- `ssh2`: For secure SSH connections to the server
- `readline`: For interactive command-line interface
- `zod`: For runtime type checking and validation

## Generated Nginx Configuration

The script generates a Nginx configuration that:

- Listens on port 80
- Supports both www and non-www domains
- Includes WebSocket support
- Sets up proper proxy headers
- Uses localhost for the backend connection

Example configuration:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Considerations

- Keep your `.env` file secure and never commit it to version control
- Ensure your SSH private key has appropriate permissions (600)
- Use strong passphrases for your SSH keys
- Regularly update your server's security settings

## Error Handling

The script includes error handling for:

- SSH connection failures
- Missing SSH keys
- Nginx configuration errors
- Command execution failures

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the ISC License - see the LICENSE file for details.
