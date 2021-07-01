import TronWeb from 'tronweb';
import Config from '../config';
import { getBaseInfo } from './backend';

import { BigNumber, openTransModal, setTransactionsData, randomSleep } from './helper';

const chain = Config.chain;

const DATA_LEN = 64;
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const privateKey = chain.privateKey;

const mainchain = new TronWeb({
  fullHost: chain.fullHost,
  privateKey
});

const { trongrid } = Config;

if (trongrid && mainchain.setHeader && mainchain.fullNode.host === trongrid.host) {
  mainchain.setHeader({ 'TRON-PRO-API-KEY': trongrid.key });
}

export const triggerSmartContract = async (address, functionSelector, options = {}, parameters = []) => {
  try {
    const tronweb = window.tronWeb;
    const transaction = await tronweb.transactionBuilder.triggerSmartContract(
      address,
      functionSelector,
      Object.assign({ feeLimit: Config.feeLimit }, options),
      parameters
    );

    if (!transaction.result || !transaction.result.result) {
      throw new Error('Unknown trigger error: ' + JSON.stringify(transaction.transaction));
    }
    return transaction;
  } catch (error) {
    throw new Error(error);
  }
};

export const sendRawTransaction = async signedTransaction => {
  try {
    const tronweb = window.tronWeb;
    const result = await tronweb.trx.sendRawTransaction(signedTransaction);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const trigger = async (address, functionSelector, parameters = [], options = {}, intlObj = {}) => {
  try {
    openTransModal(intlObj, { step: 1 });
    const tronweb = window.tronWeb;
    const transaction = await tronweb.transactionBuilder.triggerSmartContract(
      address,
      functionSelector,
      Object.assign({ feeLimit: Config.feeLimit }, options),
      parameters
    );
    if (!transaction.result || !transaction.result.result) {
      throw new Error('Unknown trigger error: ' + JSON.stringify(transaction.transaction));
    }

    const signedTransaction = await tronweb.trx.sign(transaction.transaction);
    const result = await tronweb.trx.sendRawTransaction(signedTransaction);
    openTransModal(intlObj, { step: 2, txId: result.transaction.txID });
    if (result && result.result) {
      setTransactionsData(result.transaction.txID, intlObj);
    }
    return result;
  } catch (error) {
    if (error == 'Confirmation declined by user') {
      openTransModal(intlObj, { step: 3 });
    }
    console.log(`trigger error ${address} - ${functionSelector}`, error.message ? error.message : error);
    return {};
  }
};

export const view = async (address, functionSelector, parameters = [], isDappTronWeb = true) => {
  try {
    let tronweb = mainchain;
    if (!isDappTronWeb && window.tronWeb && window.tronWeb.ready) {
      tronweb = window.tronWeb;
    }
    const result = await tronweb.transactionBuilder.triggerSmartContract(
      address,
      functionSelector,
      { _isConstant: true },
      parameters
    );
    return result && result.result ? result.constant_result : [];
  } catch (error) {
    console.log(`view error ${address} - ${functionSelector}`, error.message ? error.message : error);
    return [];
  }
};

export const getTrxBalance = async (address, isDappTronWeb = false) => {
  try {
    let tronWeb = mainchain;
    if (!isDappTronWeb && window.tronWeb && window.tronWeb.ready) {
      tronWeb = window.tronWeb;
    }
    const balance = await tronWeb.trx.getBalance(address);
    return {
      balance: BigNumber(balance).div(Config.defaultPrecision),
      success: true
    };
  } catch (err) {
    console.log(`getPairBalance: ${err}`, address);
    return {
      balance: BigNumber(0),
      success: false
    };
  }
};

export const tokenBalanceOf = async (token, userAddress) => {
  // console.log(token, userAddress);
  const result = await view(Config.contract.poly, 'getBalanceAndApprove2(address,address[],address[])', [
    { type: 'address', value: userAddress },
    { type: 'address[]', value: [token.collateralAddress] },
    { type: 'address[]', value: [token.jtokenAddress] }
  ]);
  let balance = new BigNumber(0);
  let allowance = new BigNumber(0);
  let success = false;
  if (result.length) {
    const data = result[0];
    let dataIndex = 2;
    balance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16).div(token.precision);
    allowance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
    success = true;
  }

  return {
    balance,
    allowance,
    success
  };
};

export const getTransactionInfo = tx => {
  const tronWeb = mainchain;
  return new Promise((resolve, reject) => {
    tronWeb.trx.getConfirmedTransaction(tx, (e, r) => {
      if (!e) {
        resolve(r);
      } else {
        reject(e, null);
      }
    });
  });
};

export const getLatestBlockInfo = async () => {
  try {
    const tronWeb = mainchain;
    const res = await tronWeb.trx.getCurrentBlock();
    if (res && res.block_header) {
      return {
        success: true,
        number: res.block_header.raw_data.number,
        timestamp: res.block_header.raw_data.timestamp
      };
    }
    return {
      success: false
    };
  } catch (err) {
    // 如果链上接口报错，使用后端接口
    console.log('getLatestBlockInfo: ', err);
    return await getBaseInfo();
  }
};

export const getBalance = async (address, tokens) => {
  console.log('params of getbalance: ', address, tokens);
  const result = await view(Config.contract.poly, 'getBalance(address,address[])', [
    { type: 'address', value: address },
    { type: 'address[]', value: tokens }
  ]);
  console.log('getBalanceeeeeee result', result);
  return result && result.transaction ? result.transaction.txID : '';
};

export const getBalanceInfo = async (userAddress = window.defaultAccount, tokens = [], jtokens = [], balanceInfo) => {
  if (tokens.length === 0 || jtokens.length === 0) return {};
  jtokens.map(_ => {
    if (!balanceInfo[_]) {
      balanceInfo[_] = {};
    }
  });
  try {
    const _getBalanceInfo = async (_tokens, _jtokens) => {
      await randomSleep();
      const result = await view(Config.contract.poly, 'getBalanceAndApprove2(address,address[],address[])', [
        { type: 'address', value: userAddress },
        { type: 'address[]', value: _tokens },
        { type: 'address[]', value: _jtokens }
      ]);

      if (result.length) {
        const data = result[0];
        let dataIndex = 2;

        _jtokens.forEach(t => {
          balanceInfo[t].balance = BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
          balanceInfo[t].allowance = BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
        });
        return true;
      }
    };

    const maxBalanceLength = Config.maxBalanceLength;
    let promiseFunc = [];
    for (let i = 0; ; i++) {
      const _maxTokens = tokens.slice(i * maxBalanceLength, (i + 1) * maxBalanceLength);
      const _maxJtokens = jtokens.slice(i * maxBalanceLength, (i + 1) * maxBalanceLength);
      if (_maxTokens.length) {
        promiseFunc.push(_getBalanceInfo(_maxTokens, _maxJtokens));
      } else {
        break;
      }
    }

    await Promise.all(promiseFunc);
  } catch (err) {
    console.log('getBalanceInfo:', err);
    return balanceInfo;
  }
};

export const getTRC20Balance = async (tokenAddress, userAddress) => {
  console.log('params of getbalance: ', userAddress, tokenAddress);
  const result = await view(tokenAddress, 'balanceOf(address)', [{ type: 'address', value: userAddress }]);
  let value = BigNumber(0);
  let success = false;

  if (result.length) {
    value = new BigNumber(result[0].slice(0, DATA_LEN), 16);
    success = true;
  }

  return {
    value,
    success
  };
};

export const getCash = async contractAddr => {
  const result = await view(contractAddr, 'getCash()', []);
  let balance = BigNumber(0);
  let success = false;

  if (result.length) {
    balance = new BigNumber(result[0].slice(0, DATA_LEN), 16);
    success = true;
  }
  return {
    balance,
    success
  };
};
