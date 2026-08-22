import { getErrorMessage } from '@kurier/shared';
import { BunUpdater } from 'bun-sfe-autoupdater';
import { createHash } from 'crypto';
import { replaceBinaryInPlace } from '../helpers/replace-binary-in-place';
import semver from 'semver';
import { config } from '../config';
import { logger } from '../logger';
import { IS_DOCKER, IS_PRODUCTION, SERVER_VERSION } from './env';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const REPO_OWNER = 'rf4burns';
const REPO_NAME = 'brozantine-sharkord-server';

type TReleaseArtifact = {
  name: string;
  target: string;
  size: number;
  checksum: string;
};

type TReleaseJson = {
  version: string;
  releaseDate: string;
  artifacts: TReleaseArtifact[];
};

type TGithubAsset = {
  name: string;
  url: string;
  browser_download_url: string;
};

type TGithubRelease = {
  tag_name: string;
  assets: TGithubAsset[];
};

const getGithubHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
};

const getCurrentTarget = (): string => {
  const { platform, arch } = process;

  if (platform === 'linux' && arch === 'x64') return 'linux-x64';
  if (platform === 'linux' && arch === 'arm64') return 'linux-arm64';
  if (platform === 'win32' && arch === 'x64') return 'windows-x64';
  if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (platform === 'darwin' && arch === 'x64') return 'darwin-x64';

  throw new Error(`Unsupported platform or architecture: ${platform}-${arch}`);
};

// systemd sets these when the process is a service unit
const isUnderSystemd = (): boolean =>
  Boolean(process.env.INVOCATION_ID || process.env.NOTIFY_SOCKET);

const sha256 = (data: Uint8Array): string =>
  createHash('sha256').update(data).digest('hex');

class Updater {
  private bunUpdater: BunUpdater;
  private isUpdating: boolean = false;

  constructor() {
    this.bunUpdater = new BunUpdater({
      repoOwner: REPO_OWNER,
      repoName: REPO_NAME,
      currentVersion: SERVER_VERSION,
      // relaunch the new binary after apply; does not auto-install on boot
      autoStart: true
    });

    if (!this.canUpdate()) {
      return;
    }

    this.setupAutoUpdater();
  }

  public canUpdate = (): boolean => IS_PRODUCTION && !IS_DOCKER;

  public getLatestVersion = async () => this.bunUpdater.getLatestVersion();

  public hasUpdates = async () => this.bunUpdater.hasUpdates();

  public update = async (): Promise<void> => {
    if (!this.canUpdate()) {
      throw new Error('Updates are not supported in this environment.');
    }

    if (this.isUpdating) {
      throw new Error('An update is already in progress.');
    }

    this.isUpdating = true;

    try {
      logger.info('Checking for updates...');

      // under systemd, killing the process races Restart=always against the
      // helper's file replace. swap the binary in place, then exit so systemd
      // starts the new one.
      if (isUnderSystemd()) {
        await this.updateUnderSystemd();
        return;
      }

      await this.bunUpdater.checkForUpdates({ autoStart: true });
    } finally {
      this.isUpdating = false;
    }
  };

  private fetchLatestRelease = async (): Promise<{
    release: TGithubRelease;
    metadata: TReleaseJson;
  }> => {
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      { headers: getGithubHeaders() }
    );

    if (!releaseResponse.ok) {
      throw new Error(
        `Error fetching releases: ${releaseResponse.status} ${releaseResponse.statusText}`
      );
    }

    const release = (await releaseResponse.json()) as TGithubRelease;
    const releaseAsset = release.assets.find(
      (asset) => asset.name === 'release.json'
    );

    if (!releaseAsset) {
      throw new Error('release.json artifact not found in the latest release.');
    }

    const metadataResponse = process.env.GITHUB_TOKEN
      ? await fetch(releaseAsset.url, {
          headers: {
            ...getGithubHeaders(),
            Accept: 'application/octet-stream'
          }
        })
      : await fetch(releaseAsset.browser_download_url);

    if (!metadataResponse.ok) {
      throw new Error(
        `Error fetching release.json: ${metadataResponse.status} ${metadataResponse.statusText}`
      );
    }

    const metadata = (await metadataResponse.json()) as TReleaseJson;

    return { release, metadata };
  };

  private updateUnderSystemd = async (): Promise<void> => {
    if (!process.execPath || process.execPath.includes('.bun/bin/')) {
      throw new Error(
        'Updater can only run on standalone Bun applications, not on "bun run" scripts.'
      );
    }

    const { release, metadata } = await this.fetchLatestRelease();
    const target = getCurrentTarget();
    const artifact = metadata.artifacts.find((item) => item.target === target);

    if (!artifact) {
      throw new Error(
        `No suitable artifact found for architecture ${target} in release.json`
      );
    }

    const asset = release.assets.find((item) => item.name === artifact.name);

    if (!asset) {
      throw new Error(
        `No asset found in the release matching artifact ${artifact.name}.`
      );
    }

    if (!semver.gt(metadata.version, SERVER_VERSION)) {
      logger.info('No updates available.');
      return;
    }

    logger.info(
      'Update available under systemd: %s (current: %s)',
      metadata.version,
      SERVER_VERSION
    );

    const downloadUrl = process.env.GITHUB_TOKEN
      ? asset.url
      : asset.browser_download_url;
    const downloadHeaders: Record<string, string> = {
      Accept: 'application/octet-stream',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (process.env.GITHUB_TOKEN) {
      downloadHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const binaryResponse = await fetch(downloadUrl, {
      headers: downloadHeaders
    });

    if (!binaryResponse.ok) {
      throw new Error(
        `Error downloading new binary: ${binaryResponse.status} ${binaryResponse.statusText}`
      );
    }

    const fileData = new Uint8Array(await binaryResponse.arrayBuffer());
    const checksum = sha256(fileData);

    if (checksum !== artifact.checksum) {
      throw new Error(
        `Checksum verification failed. Expected: ${artifact.checksum}, Got: ${checksum}`
      );
    }

    const currentPath = process.execPath;

    // linux allows replacing a running binary; the current process keeps the
    // old inode until exit. systemd then starts the new file at the same path.
    await replaceBinaryInPlace(currentPath, fileData);

    logger.info(
      'Binary replaced with %s; exiting so systemd can restart',
      metadata.version
    );

    // let the tRPC response flush, then exit cleanly for Restart=
    setTimeout(() => {
      process.exit(0);
    }, 250);
  };

  private setupAutoUpdater = async (): Promise<void> => {
    if (!config.server.autoupdate) {
      return;
    }

    logger.info(
      `Auto-updater enabled, checking every ${UPDATE_CHECK_INTERVAL_MS / 1000 / 60} minutes`
    );

    try {
      await this.update();
    } catch (error) {
      logger.error('Failed to check for updates: %s', getErrorMessage(error));
    }

    setInterval(() => {
      void this.update().catch((error) => {
        logger.error('Failed to check for updates: %s', getErrorMessage(error));
      });
    }, UPDATE_CHECK_INTERVAL_MS);
  };
}

const updater = new Updater();

export { updater };
