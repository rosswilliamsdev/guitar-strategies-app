# How to SSH into Your EC2 Instance - Complete Guide

This guide explains how to access your EC2 server to manage environment variables, deploy code, and troubleshoot your application.

## What is SSH?

SSH (Secure Shell) is how you remotely access and control your EC2 server. Think of it like remote desktop, but text-based. You type commands on your local computer that execute on the EC2 server.

---

## Prerequisites

Before you can SSH into EC2, you need:

1. ✅ AWS account access (to view EC2 instances)
2. ✅ EC2 instance running (your app server)
3. ✅ SSH key pair file (`.pem` file) **← Most important!**
4. ✅ Terminal application:
   - **Mac**: Built-in Terminal app
   - **Windows**: PowerShell, CMD, or WSL (Windows Subsystem for Linux)

---

## Step 1: Find Your EC2 Information

You need 3 pieces of information to connect:

### 1.1 Get Your EC2 Public IP Address

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Click **Instances** in the left sidebar
3. Find your running instance (look for "guitar-strategies" or your app name)
4. In the details pane (bottom), find:
   - **Public IPv4 address**: `3.235.147.88` (example)
   - **Public IPv4 DNS**: `ec2-3-235-147-88.compute-1.amazonaws.com` (example)

**Use either the IP or DNS** - both work the same way.

### 1.2 Determine Your EC2 Username

The username depends on which operating system (AMI) you used:

| AMI Type | Username |
|----------|----------|
| Amazon Linux 2 or Amazon Linux 2023 | `ec2-user` |
| Ubuntu | `ubuntu` |
| Red Hat Enterprise Linux | `ec2-user` |
| Debian | `admin` |
| CentOS | `centos` |

**Not sure?** Try `ec2-user` first (most common).

To check your AMI:
1. AWS EC2 Console → Select your instance
2. Look at **AMI ID** and **Platform details** in the description

### 1.3 Locate Your SSH Key File (.pem)

**This is the most important part!**

Your SSH key file:
- Ends with `.pem` (e.g., `guitar-strategies-key.pem`)
- Was downloaded when you created the EC2 instance
- Usually in your `~/Downloads` folder
- **Cannot be retrieved from AWS** if lost (security feature)

#### Finding Your Key File

**Option A: Search Your Computer**

Mac/Linux:
```bash
find ~ -name "*.pem" 2>/dev/null
```

Windows PowerShell:
```powershell
Get-ChildItem -Path $HOME -Filter *.pem -Recurse -ErrorAction SilentlyContinue
```

**Option B: Check Common Locations**
- `~/Downloads/`
- `~/.ssh/`
- `~/Desktop/`
- `~/Documents/`

**Option C: Check AWS EC2 Console**
1. EC2 Console → **Key Pairs** (left sidebar under "Network & Security")
2. Find your key pair name
3. **Note**: You can see the name, but NOT download the private key

---

## Step 2: Connect to EC2 via SSH

### Method 1: Traditional SSH (Recommended)

#### Mac / Linux Instructions

1. **Open Terminal**
   - Mac: Press `Cmd+Space`, type "Terminal", press Enter
   - Linux: Press `Ctrl+Alt+T`

2. **Navigate to your key file location**
   ```bash
   cd ~/Downloads  # or wherever your .pem file is
   ```

3. **Set correct permissions** (REQUIRED - SSH will reject if wrong)
   ```bash
   chmod 400 your-key-name.pem
   ```

4. **Connect to EC2**
   ```bash
   ssh -i your-key-name.pem ec2-user@your-ec2-ip-address
   ```

   **Example:**
   ```bash
   ssh -i guitar-strategies-key.pem ec2-user@3.235.147.88
   ```

5. **First-time connection prompt**

   You'll see:
   ```
   The authenticity of host '3.235.147.88 (3.235.147.88)' can't be established.
   ECDSA key fingerprint is SHA256:...
   Are you sure you want to continue connecting (yes/no)?
   ```

   Type `yes` and press Enter.

6. **Success!**

   You should see something like:
   ```
      __| __|_  )
      _|  (     /   Amazon Linux 2 AMI
     ___|\___|___|

   [ec2-user@ip-172-31-12-34 ~]$
   ```

   You're now inside your EC2 server! 🎉

#### Windows Instructions

**Option A: Use PowerShell (Windows 10+)**

1. **Open PowerShell**
   - Press `Win+X`, select "Windows PowerShell"

2. **Navigate to your key file**
   ```powershell
   cd $HOME\Downloads  # or wherever your .pem file is
   ```

3. **Connect** (Windows 10+ has built-in SSH)
   ```powershell
   ssh -i your-key-name.pem ec2-user@your-ec2-ip
   ```

**Option B: Use PuTTY (Older Windows)**

PuTTY requires converting `.pem` to `.ppk` format:

1. Download [PuTTY](https://www.putty.org/) and PuTTYgen
2. Open **PuTTYgen**
3. Click **Load** → Select your `.pem` file
4. Click **Save private key** → Save as `.ppk`
5. Open **PuTTY**
6. Configure:
   - **Host Name**: `ec2-user@your-ec2-ip`
   - **Connection** → **SSH** → **Auth** → Browse to your `.ppk` file
7. Click **Open**

---

## Method 2: AWS Systems Manager (No SSH Key Needed!)

If your EC2 instance has AWS Systems Manager Session Manager enabled, you can connect without an SSH key.

### Via AWS Console (Browser-Based Terminal)

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Click **Instances** (left sidebar)
3. Select your instance (checkbox)
4. Click **Connect** button (top-right)
5. Choose **Session Manager** tab
6. Click **Connect** button

A browser-based terminal opens immediately - no SSH key needed!

### Via AWS CLI

```bash
# 1. Install AWS CLI (if not already installed)
# Mac:
brew install awscli

# Windows:
# Download from: https://aws.amazon.com/cli/

# Linux:
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 2. Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Default region, Output format

# 3. Get your instance ID
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0],State.Name]' --output table

# 4. Connect to instance
aws ssm start-session --target i-1234567890abcdef0
```

**Note**: Session Manager only works if:
- Your EC2 instance has the SSM Agent installed (pre-installed on Amazon Linux 2, Ubuntu)
- The EC2 instance has an IAM role with `AmazonSSMManagedInstanceCore` policy attached

---

## Step 3: Navigate to Your App

Once you're connected to EC2:

```bash
# Check where you are
pwd
# Output: /home/ec2-user (or /home/ubuntu)

# List files and folders
ls -la

# Find your app directory
# Common locations:
# - ~/guitar-strategies-app
# - ~/app
# - /var/www/guitar-strategies-app
# - /opt/guitar-strategies-app

# Example: Navigate to app
cd guitar-strategies-app

# Verify you're in the right place
ls -la
# You should see: package.json, dockerfile, .next/, etc.
```

---

## Step 4: Manage Environment Variables

### View Current Environment Variables

```bash
# Navigate to your app directory first
cd ~/guitar-strategies-app  # or your actual path

# View .env file (if it exists)
cat .env

# Or view with line numbers
cat -n .env
```

### Create or Edit .env File

#### Using nano (Easier for Beginners)

```bash
# Create or edit .env
nano .env
```

**Nano Editor Shortcuts:**
- Arrow keys: Move cursor
- `Ctrl+O`: Save file
- `Ctrl+X`: Exit
- `Ctrl+K`: Cut line
- `Ctrl+U`: Paste line

**Add your environment variables:**
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Auth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://app.guitarstrategies.com"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="guitar-strategies-files"

# Cron Authentication
CRON_SECRET="your-generated-secret"

# Email
RESEND_API_KEY="re_..."

# OpenAI (optional)
OPENAI_API_KEY="sk-proj-..."
```

**Save and exit:**
1. Press `Ctrl+O` (save)
2. Press `Enter` (confirm filename)
3. Press `Ctrl+X` (exit)

#### Using vi (Advanced)

```bash
# Edit .env
vi .env
```

**Vi Editor Commands:**
- Press `i`: Enter insert mode (start typing)
- Press `Esc`: Exit insert mode
- Type `:w`: Save file
- Type `:q`: Quit
- Type `:wq`: Save and quit
- Type `:q!`: Quit without saving

### Generate CRON_SECRET on EC2

```bash
# Generate a secure random secret
openssl rand -base64 32

# Copy the output and add it to your .env file:
# CRON_SECRET="the-generated-value-here"
```

### Set File Permissions (Security)

```bash
# Make .env readable only by you
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (owner read/write only)
```

---

## Step 5: Restart Your Application

After updating `.env`, you need to restart your app for changes to take effect.

### If Using Docker

```bash
# Stop and remove old container
docker stop guitar-strategies
docker rm guitar-strategies

# Rebuild Docker image
docker build -t guitar-strategies .

# Run with new environment variables
docker run -d \
  --name guitar-strategies \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  guitar-strategies

# Or if using docker-compose:
docker-compose down
docker-compose up -d

# View logs to verify it started correctly
docker logs -f guitar-strategies
```

### If Using PM2 (Node.js Process Manager)

```bash
# Restart the application
pm2 restart guitar-strategies

# Or reload with zero downtime
pm2 reload guitar-strategies

# View logs
pm2 logs guitar-strategies
```

### If Running Directly (No Docker/PM2)

```bash
# Stop the current process (if running in background)
pkill -f "node server.js"

# Start the application
npm run start
# Or:
node server.js
```

---

## Step 6: Verify Changes

### Check Environment Variables are Loaded

```bash
# View environment variables inside Docker container
docker exec guitar-strategies env | grep -E "DATABASE_URL|AWS_REGION|CRON_SECRET"

# Or view all environment variables
docker exec guitar-strategies env
```

### Check Application Logs

```bash
# Docker logs (live tail)
docker logs -f guitar-strategies

# View last 100 lines
docker logs --tail 100 guitar-strategies

# Check for specific errors
docker logs guitar-strategies 2>&1 | grep -i error
```

### Test Application is Running

```bash
# Check if app is responding on port 3000
curl http://localhost:3000

# Or check publicly (replace with your domain)
curl https://app.guitarstrategies.com
```

---

## Troubleshooting

### Problem: "Permission denied (publickey)"

**Cause**: Wrong key file, wrong permissions, or wrong username

**Solutions:**

1. **Check key file permissions**
   ```bash
   chmod 400 your-key.pem
   ```

2. **Try different username**
   ```bash
   # Try ec2-user
   ssh -i your-key.pem ec2-user@your-ec2-ip

   # Try ubuntu
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Verify you're using the correct key file**
   - Check AWS EC2 Console → Instances → Select your instance
   - Look at **Key pair name** in the description

### Problem: "Connection timed out"

**Cause**: Security group doesn't allow SSH (port 22)

**Solution:**

1. Go to AWS EC2 Console → Instances
2. Select your instance
3. Click **Security** tab
4. Click on the security group name
5. Click **Edit inbound rules**
6. Add rule:
   - **Type**: SSH
   - **Protocol**: TCP
   - **Port**: 22
   - **Source**: `My IP` (recommended) or `0.0.0.0/0` (allow from anywhere - less secure)
7. Click **Save rules**

### Problem: "Host key verification failed"

**Cause**: EC2 instance was stopped/started and got a new IP

**Solution:**

```bash
# Remove old host key
ssh-keygen -R your-ec2-ip

# Or remove entire known_hosts file (nuclear option)
rm ~/.ssh/known_hosts

# Try connecting again
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### Problem: "I don't have the .pem key file"

**Unfortunately**: AWS doesn't store private keys. If you lost it, you can't retrieve it.

**Options:**

1. **Search your computer thoroughly**
   ```bash
   find ~ -name "*.pem" 2>/dev/null
   ```

2. **Check with team members** who set up the EC2 instance

3. **Create a new key pair and attach it** (Advanced - see section below)

4. **Use AWS Systems Manager Session Manager** (if enabled - see Method 2 above)

### Problem: Docker command not found

**Cause**: Docker is not installed or not in PATH

**Solution:**

```bash
# Check if Docker is installed
which docker

# If not installed, install Docker
sudo yum install -y docker  # Amazon Linux
# or
sudo apt-get install -y docker.io  # Ubuntu

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
exit
# Then SSH back in
```

---

## Advanced: Creating a New SSH Key (If Original is Lost)

**Warning**: This is complex and requires stopping your EC2 instance (downtime).

### Step 1: Create New Key Pair in AWS

1. AWS EC2 Console → **Key Pairs** (left sidebar)
2. Click **Create key pair**
3. Name: `guitar-strategies-new-key`
4. Key pair type: RSA
5. Private key format: `.pem`
6. Click **Create key pair**
7. Download and save the `.pem` file securely

### Step 2: Attach New Key to Existing Instance

**Option A: Using AWS Systems Manager (Easier)**

If you can access via Session Manager:

```bash
# Connect via Session Manager first
# Then add your new public key

# On your local computer, extract public key from .pem
ssh-keygen -y -f guitar-strategies-new-key.pem > new-key.pub

# Copy the contents of new-key.pub
cat new-key.pub

# Back on EC2 (via Session Manager), add it:
echo "paste-public-key-here" >> ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Now you can SSH with the new key
ssh -i guitar-strategies-new-key.pem ec2-user@your-ec2-ip
```

**Option B: Using AWS EC2 Console (More Complex)**

This requires stopping the instance:

1. **Stop the EC2 instance** (Actions → Instance State → Stop)
2. **Detach root volume** (Volumes → Select root volume → Actions → Detach)
3. **Launch a temporary instance** with your new key pair
4. **Attach the root volume** to the temporary instance
5. **Mount the volume** and add your new public key to `~/.ssh/authorized_keys`
6. **Detach volume** from temporary instance
7. **Reattach volume** to original instance
8. **Start the original instance**

This is tedious - **much better to find the original key or use Session Manager!**

---

## Quick Reference

### SSH Connection

```bash
# Standard SSH
ssh -i /path/to/key.pem ec2-user@ec2-ip-address

# With verbose logging (for troubleshooting)
ssh -v -i /path/to/key.pem ec2-user@ec2-ip-address

# Using DNS instead of IP
ssh -i /path/to/key.pem ec2-user@ec2-3-235-147-88.compute-1.amazonaws.com
```

### File Transfer (SCP)

```bash
# Copy file TO EC2
scp -i key.pem local-file.txt ec2-user@ec2-ip:/home/ec2-user/

# Copy file FROM EC2
scp -i key.pem ec2-user@ec2-ip:/home/ec2-user/remote-file.txt ./

# Copy entire directory
scp -i key.pem -r local-folder ec2-user@ec2-ip:/home/ec2-user/
```

### Common EC2 Commands

```bash
# Check system info
uname -a
cat /etc/os-release

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
top
# Press 'q' to quit

# View Docker containers
docker ps

# View Docker logs
docker logs -f container-name

# Edit .env file
nano .env

# Restart Docker container
docker restart container-name

# Exit SSH session
exit
# or press Ctrl+D
```

---

## Security Best Practices

### Protect Your SSH Key

```bash
# Set strict permissions on .pem file
chmod 400 your-key.pem

# Store in a secure location
mkdir -p ~/.ssh
mv your-key.pem ~/.ssh/
chmod 700 ~/.ssh
```

### Protect Your .env File on EC2

```bash
# Set permissions (only you can read)
chmod 600 .env

# Verify
ls -la .env
# Should show: -rw------- (owner read/write only)

# Never commit .env to git
echo ".env" >> .gitignore
```

### Enable MFA for AWS Console

1. AWS Console → Your account name (top-right) → Security Credentials
2. Multi-factor authentication (MFA) → Activate MFA
3. Follow the wizard to set up MFA with your phone

### Restrict SSH Access by IP

1. EC2 Console → Security Groups
2. Edit inbound rules for SSH (port 22)
3. Change source from `0.0.0.0/0` to `My IP`
4. This only allows SSH from your current IP address

---

## Next Steps

Once you're successfully connected and have updated `.env`:

1. ✅ Verify environment variables are loaded
2. ✅ Restart your application
3. ✅ Test application functionality
4. ✅ Check logs for errors
5. ✅ Continue with AWS Setup Guide for S3, Lambda, etc.

---

## Need Help?

- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **SSH Troubleshooting**: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesConnecting.html
- **AWS Systems Manager**: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
