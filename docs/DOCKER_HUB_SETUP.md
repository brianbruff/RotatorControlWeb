# Docker Hub Setup Instructions

## Prerequisites

Before the GitHub Action can push images to Docker Hub, you need to:

1. **Create a Docker Hub Account** (if you don't have one)
   - Go to https://hub.docker.com
   - Sign up for a free account

2. **Create the Docker Hub Repository**
   - Log in to Docker Hub
   - Create a new repository named `rotctlweb`
   - Make it public

3. **Generate a Docker Hub Access Token**
   - Go to https://hub.docker.com/settings/security
   - Click "New Access Token"
   - Description: `GitHub Actions - RotatorControlWeb`
   - Access permissions: `Read, Write, Delete`
   - Click "Generate"
   - **COPY THE TOKEN NOW** (you won't see it again!)

## GitHub Repository Setup

1. **Add the Docker Hub Token as a GitHub Secret**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `DOCKER_HUB_TOKEN`
   - Value: (paste your Docker Hub access token)
   - Click "Add secret"

## Triggering the Build

The GitHub Action will automatically build and push to Docker Hub when:

- **Push to main branch**: Creates `latest` tag and branch-specific tag
- **Create a version tag**: e.g., `v1.0.0` creates versioned tags
- **Manual trigger**: Go to Actions tab → Select workflow → Run workflow

## Image Tags

The action creates multiple tags:

- `brianbruff/rotctlweb:latest` - Always points to latest main branch
- `brianbruff/rotctlweb:main` - Main branch build
- `brianbruff/rotctlweb:v1.0.0` - Version tags (when you create a git tag)
- `brianbruff/rotctlweb:1.0` - Major.minor version
- `brianbruff/rotctlweb:1` - Major version only
- `brianbruff/rotctlweb:main-sha-abc123` - Commit-specific tags

## Creating a Release

To create a versioned release:

```bash
# Tag the current commit
git tag v1.0.0
git push origin v1.0.0

# Or create and push in one command
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin --tags
```

## Multi-Architecture Support

The action builds for multiple platforms:
- `linux/amd64` - Standard x86_64 (Intel/AMD)
- `linux/arm64` - ARM 64-bit (Raspberry Pi 4, Apple Silicon)
- `linux/arm/v7` - ARM 32-bit (Raspberry Pi 2/3)

## Monitoring Builds

- Check build status: https://github.com/brianbruff/RotatorControlWeb/actions
- View images: https://hub.docker.com/r/brianbruff/rotctlweb

## Troubleshooting

If builds fail:

1. **Check GitHub Actions logs**
   - Go to Actions tab in your repository
   - Click on the failed workflow run
   - Review the error messages

2. **Verify Docker Hub token**
   - Ensure `DOCKER_HUB_TOKEN` secret is set correctly
   - Try regenerating the token if authentication fails

3. **Check Docker Hub repository**
   - Ensure repository `brianbruff/rotctlweb` exists
   - Verify it's set to public access

## Local Testing

Test the Docker build locally:

```bash
# Build for current platform
docker build -t brianbruff/rotctlweb:test .

# Build multi-platform (requires buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t brianbruff/rotctlweb:test .
```