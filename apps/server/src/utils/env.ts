// these values are injected at build time
const KURIER_ENV = process.env.KURIER_ENV;
const KURIER_BUILD_VERSION = process.env.KURIER_BUILD_VERSION;
const KURIER_BUILD_DATE = process.env.KURIER_BUILD_DATE;
const KURIER_MEDIASOUP_BIN_NAME = process.env.KURIER_MEDIASOUP_BIN_NAME;

const SERVER_VERSION =
  typeof KURIER_BUILD_VERSION !== 'undefined'
    ? KURIER_BUILD_VERSION
    : '0.0.0-dev';

const BUILD_DATE =
  typeof KURIER_BUILD_DATE !== 'undefined' ? KURIER_BUILD_DATE : 'dev';

const env = typeof KURIER_ENV !== 'undefined' ? KURIER_ENV : 'development';
const IS_PRODUCTION = env === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_E2E = process.env.IS_E2E === 'true';
const IS_DOCKER = process.env.RUNNING_IN_DOCKER === 'true';

if (IS_PRODUCTION) {
  if (!KURIER_MEDIASOUP_BIN_NAME) {
    throw new Error('KURIER_MEDIASOUP_BIN is not defined');
  }
}

export {
  BUILD_DATE,
  IS_DEVELOPMENT,
  IS_DOCKER,
  IS_E2E,
  IS_PRODUCTION,
  IS_TEST,
  KURIER_MEDIASOUP_BIN_NAME,
  SERVER_VERSION
};
