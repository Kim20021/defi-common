const env = process.env.REACT_APP_ENV;

const Config = {
  version: 'v 1.0.0',
  chain: {
    privateKey: '01',
    fullHost: 'https://api.trongrid.io'
  },
  trongrid: {
    host: 'https://api.trongrid.io',
    key: 'a4754d8e-ddaa-4322-9a88-80cf84d9b6f2'
  },
  blockPerYear: 10512000,
  defaultPrecision: 1e6,
  tokenDefaultPrecision: 1e18
};

let devConfig = {};
if (env === 'test') {
  devConfig = {
    chain: {
      privateKey: '01',
      fullHost: 'https://api.nileex.io'
    }
  };
}
export default Object.assign(Config, devConfig);
