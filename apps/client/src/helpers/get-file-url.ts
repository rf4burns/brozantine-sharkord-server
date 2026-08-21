import type { TFile } from '@kurier/shared';
import { getActiveHost } from './saved-hosts';

const getHostFromServer = () => getActiveHost();

const getUrlFromServer = () => {
  const host = getHostFromServer();

  if (import.meta.env.MODE === 'development' && host.startsWith('localhost')) {
    return `http://${host}`;
  }

  const currentProtocol = window.location.protocol;

  return `${currentProtocol}//${host}`;
};

const getFileUrl = (file: TFile | undefined | null) => {
  if (!file) return '';

  const url = getUrlFromServer();

  let baseUrl = `${url}/public/${file.name}`;

  if (file._accessToken) {
    baseUrl += `?accessToken=${file._accessToken}`;

    if (file._accessTokenExpiresAt) {
      baseUrl += `&expires=${file._accessTokenExpiresAt}`;
    }
  }

  return encodeURI(baseUrl);
};

export { getFileUrl, getHostFromServer, getUrlFromServer };
