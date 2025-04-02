# Deployment Scripts

A collection of scripts to automate the deployment of Node.js applications, from server configuration to application deployment.

## Scripts Overview

### 1. PM2 Deployment Script (`pm2.index.js`)

Automates the deployment of Node.js applications using PM2 process manager.

**Features:**

- Automatic port management
- Environment variables handling
- PM2 ecosystem file management
- Backup and restore functionality
- Input validation using Zod

**Usage:**

```bash
npm run pm2
```

### 2. Nginx Configuration Script (`nginx.index.js`)

Manages Nginx server configurations for reverse proxy setup.

**Features:**

- Virtual host configuration
- WebSocket support
- Automatic configuration testing
- Template-based configuration

**Usage:**

```bash
npm run nginx
```

### 3. GitHub Configuration Script (`github.index.js`)

Handles GitHub repository setup and deployment configurations.

**Features:**

- Repository secrets management
- Webhook configuration
- Deployment keys setup
- Secure encryption using libsodium-wrappers

**Usage:**

```bash
npm run github
```

## Prerequisites

- Node.js installed
- SSH access to target server
- Proper server permissions

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment:

```bash
cp .env.example .env
```

4. Edit `.env` with your settings:

```env
SERVER_IP_ADDRESS=your_server_ip
USER_SSH=your_ssh_username
SSH_PRIVATE_KEY=your_private_key_name
# Optional: SSH_PASSPHRASE=your_key_passphrase
# Optional: GITHUB_TOKEN=your_github_token
```

## Dependencies

- `ssh2`: SSH connection handling
- `readline`: Interactive CLI
- `zod`: Runtime validation
- `libsodium-wrappers`: Secure encryption

## Deployment Workflow

1. **Server Setup** (Nginx Script)

   - Configure reverse proxy
   - Configure virtual hosts

2. **Repository Setup** (GitHub Script)

   - Configure repository secrets
   - Set up deployment keys
   - Configure webhooks

3. **Application Deployment** (PM2 Script)
   - Deploy application
   - Configure environment variables
   - Manage process with PM2

## Security Considerations

- Keep `.env` file secure
- Use strong SSH key passphrases
- Regular server security updates
- Minimal GitHub token permissions
- Proper file permissions (600 for SSH keys)

## Error Handling

All scripts include comprehensive error handling:

- SSH connection failures
- Configuration errors
- Permission issues
- Validation errors
- Backup and restore functionality

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the ISC License - see the LICENSE file for details.
