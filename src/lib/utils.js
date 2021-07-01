import React from 'react';
import TronWeb from 'tronweb';
import intl from 'react-intl-universal';
import moment from 'moment';
import bigNumber from 'bignumber.js';
import Config from '../config';
import { Modal, Progress } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import { getCash } from './blockchain';

import TransCancelledIcon from '../assets/images/TransactionCanceled.svg';
import TransSubmittedIcon from '../assets/images/TransactionSubmitted.svg';
import emptyImg from '../assets/images/tableNoData.svg';

let modalRef = null;
const chain = Config.chain;

const tronWeb = new TronWeb({
  fullHost: chain.fullHost
});

bigNumber.config({ EXPONENTIAL_AT: 1e9 });
bigNumber.prototype._toFixed = function (...arg) {
  return new bigNumber(this.toFixed(...arg)).toString();
};
bigNumber.prototype._toBg = function () {
  return this;
};
bigNumber.prototype._toHex = function () {
  return `0x${this.toString(16)}`;
};

export const toBigNumber = tronWeb.toBigNumber;

// export const BigNumber = tronWeb.BigNumber;
export const BigNumber = bigNumber;

export const toDecimal = tronWeb.toDecimal;

export const getTrxBalance = address => {
  return tronWeb.trx.getBalance(address);
};

export const formatNumber = (
  number,
  decimals = false,
  {
    cutZero = true,
    miniText = false,
    miniTextValue = miniText,
    needDolar = false,
    round = false,
    per = false,
    uint = false
  } = {}
) => {
  if (number === '--' || BigNumber(number).isNaN()) return '--';

  // 降级方案与SUNOLD.io保持一致，具体如下：
  // 1、页面全部存/借款、挖矿收益均显示 <$0.01，币种数量均显示 < 0.001 Token；
  // 2、全部存/借款APY均显示 <1%。
  if (!number || BigNumber(number).lt(0)) {
    // if (!number || BigNumber(number).lte(0)) {
    if (needDolar) {
      return '< $0.01';
    } else if (per) {
      return '< 1';
    } else {
      return '< 0.001';
    }
  }

  if ((BigNumber(number).lt(0) && uint) || BigNumber(number).eq(0)) {
    return `${needDolar ? '$' : ''}0`;
  }

  if (miniText || miniText === 0) {
    // if (BigNumber(number).gte(0) && BigNumber(number).lt(miniText)) {
    if (!BigNumber(number).gte(miniText)) {
      // 净值APY可能是负数
      return `< ${needDolar ? '$' : ''}${miniTextValue ? miniTextValue : miniText}`;
    }
  }

  tronWeb.BigNumber.config({
    ROUNDING_MODE: tronWeb.BigNumber.ROUND_HALF_UP,
    FORMAT: {
      decimalSeparator: '.',
      groupSeparator: per ? '' : ',',
      groupSize: 3
    }
  });
  let object = toBigNumber(number);

  // If rounding, use BigNumber's .toFormat() method
  // if (round) return decimals ? object.toFormat(decimals) : object.toFormat();

  if (decimals || decimals === 0) {
    decimals = Number(decimals);
    const d = toBigNumber(10).pow(decimals);
    let property = tronWeb.BigNumber.ROUND_DOWN;
    if (round) {
      property = tronWeb.BigNumber.ROUND_HALF_UP;
    }
    object = object.times(d).integerValue(property).div(d).toFixed(decimals);
  } else {
    object = object.valueOf();
  }
  const parts = object.toString().split('.');
  if (cutZero) {
    parts[1] = parts[1] ? parts[1].replace(/0+?$/, '') : '';
  }

  let res = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? `.${parts[1]}` : '');

  if (per) {
    res = parts[0] + (parts[1] ? `.${parts[1]}` : '');
  }

  if (isNaN(parseFloat(res))) {
    res = 0;
  }

  if (needDolar && (((miniText || miniText === 0) && BigNumber(number).gt(miniText)) || !miniText)) {
    res = '$' + res;
  }

  return res;
};

export const toFixedDown = (num, decimals = 4) => {
  const d = toBigNumber(10).pow(decimals);
  return BigNumber(num).times(d).integerValue(BigNumber.ROUND_DOWN).div(d).toFixed(decimals);
};

export const fromHex = hexString => {
  return tronWeb.address.fromHex(hexString.replace('/^0x/', '41'));
};

export const addressToHex = addr => {
  return tronWeb.address.toHex(addr);
};

export const isAddress = address => {
  return tronWeb.isAddress(address);
};

export const tronscanAddress = (text, address) => {
  return (
    <a
      className="typo-text-link"
      href={`${Config.tronscanUrl}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const tronscanTX = (text, tx) => {
  return (
    <a
      className="typo-text-link"
      href={`${Config.tronscanUrl}/transaction/${tx}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const copyToClipboard = (e, disBottom = '5px', p = false) => {
  let value = '';
  if (p) {
    value = document.getElementById(p).title;
  } else {
    value = e.target.title;
  }
  value = value.replace(/,/g, '');

  var aux = document.createElement('input');

  if (tronWeb.BigNumber.isBigNumber(value)) {
    aux.setAttribute('value', toBigNumber(value).valueOf());
  } else {
    aux.setAttribute('value', value.valueOf());
  }

  document.body.appendChild(aux);
  aux.select();
  document.execCommand('copy');
  document.body.removeChild(aux);
  const div = document.createElement('div');
  div.innerHTML = intl.get('account_modal.copied');
  div.className = 'copied-style-sp';
  Object.assign(div.style, {
    bottom: disBottom
  });
  if (p) {
    document.getElementById(p).appendChild(div);
  } else {
    e.target.appendChild(div);
  }
  const parent = p ? document.getElementById(p) : e.target;
  setTimeout(() => parent.removeChild(div), 1000);
};

export const SUPPOER_LOCALES = [
  {
    name: 'English',
    value: 'en-US'
  },
  {
    name: '简体中文',
    value: 'zh-CN'
  }
];

export const cutMiddle = (text = '', left = 4, right = 4) => {
  if (text.length <= left + right) return text;
  return `${text.substr(0, left).trim()}...${text.substr(-right)}`;
};

export const numberParser = (str, decimal) => {
  str = String(str);
  if (!str) return { valid: true, str: '' };

  let reg = new RegExp(`^(\\d+)(\\.\\d*)?$`);
  if (decimal !== undefined) {
    reg = new RegExp(`^(\\d+)(\\.\\d{0,${decimal}})?$`);
  }

  if (!reg.test(str)) {
    return { valid: false, str: '' };
  } else {
    return { valid: true, str: str.replace(/^0+(\d)/g, '$1') };
  }
};

export const openTransModal = (intlObj = {}, { step = 0, txId = '' }) => {
  modalRef && modalRef.destroy();

  if (!step) return;

  const config = {
    title: '',
    className: 'trans-modal',
    icon: null,
    // width: 630,
    // style: { marginLeft: getModalLeft() },
    content: (
      <div className="trans-modal-body center">
        <div className="trans-modal-title">{intl.get(intlObj.title, intlObj.obj)}</div>
        {step == 1 ? (
          <React.Fragment>
            <div className="trans-modal-icon">
              <LoadingOutlined style={{ fontSize: '80px' }}></LoadingOutlined>
            </div>
            <div className="trans-modal-status trans-modal-wait-confirm">{intl.get('deposit.explanation2')}</div>
            {/* <div className="trans-modal-tips trans-modal-wait-confirm-tips">{intl.get('deposit.explanation2')}</div> */}
          </React.Fragment>
        ) : null}
        {step == 2 ? (
          <React.Fragment>
            <div className="trans-modal-icon">
              <img src={TransSubmittedIcon} alt="" style={{ width: '86px' }} />
            </div>
            {/* <div className="trans-modal-status trans-modal-submit">{intl.get('deposit.explanation4')}</div> */}
            <div className="trans-modal-tips trans-modal-submit-tips">
              {tronscanTX(intl.get('deposit.explanation4'), txId)}
            </div>
          </React.Fragment>
        ) : null}
        {step == 3 ? (
          <React.Fragment>
            <div className="trans-modal-icon">
              <img src={TransCancelledIcon} alt="" style={{ width: '86px' }} />
            </div>
            <div className="trans-modal-status trans-modal-cancel">{intl.get('deposit.explanation3')}</div>
          </React.Fragment>
        ) : null}
      </div>
    )
  };

  modalRef = Modal.info(config);
};

export const setTransactionsData = (tx, intlObj) => {
  let data = window.localStorage.getItem(window.defaultAccount) || '[]';
  let dataArr = JSON.parse(data);
  let item = {
    title: '', // 兼容
    intlObj,
    tx,
    status: 1, // 1: pending, 2: confirmed, 3: failed
    checkCnt: 0,
    showPending: true
  };
  dataArr.unshift(item);
  window.localStorage.setItem(window.defaultAccount, JSON.stringify(dataArr.slice(0, 10)));
};

export const getModalLeft = () => {
  const element = document.getElementById('swap-tab');

  if (!element) return 0;

  let actualLeft = element.offsetLeft;
  let current = element.offsetParent;
  while (current !== null) {
    actualLeft += current.offsetLeft;
    current = current.offsetParent;
  }

  return actualLeft;
};

export const getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

//获取当前时间对应零时区的整天 即零点 毫秒级别
export function getUTCDay(unixDateParams) {
  let unix = moment(moment.unix(unixDateParams).utc().format('YYYY-MM-DD 00:00:00Z')).unix();
  return unix;
}

//获取当前时间的上一分钟取整数 UTC
export function getLastUTCMinutes() {
  let unix = moment(moment().subtract(1, 'minutes').format('YYYY-MM-DD HH:mm:00')).utc().unix();
  return unix;
}

//获取当前时间的当前分钟 一分钟取整数 UTC
export function getCurrentMinutes() {
  let unix = moment(moment().format('YYYY-MM-DD HH:mm:00')).utc().unix();
  return unix;
}

export const randomSleep = (time = 1000) => {
  return new Promise((reslove, reject) => {
    const timeout = parseInt(Math.random() * time);
    setTimeout(() => {
      reslove();
    }, timeout);
  });
};

export const reTry = async func => {
  try {
    await randomSleep(1000);
    return await func();
  } catch (error) {
    // console.log(error);
    await randomSleep(3000);
    return await reTry(func);
  }
};

export const addKey = (data = []) => {
  data.map((item, index) => {
    item.key = index;
  });
  return [...data];
};

export const emptyReactNode = () => {
  let centerStyle = {
    paddingTop: '50px',
    paddingBottom: '50px',
    position: 'relative'
  };
  let imgStyle = {
    width: '10%',
    maxWidth: '200px',
    minWidth: '100px'
  };
  let textStyle = {
    position: 'absolute',
    transform: 'translate(-50%)',
    top: '40%',
    left: '50%',
    color: '#84869E',
    fontSize: '12px'
  };
  return (
    <div className="center" style={centerStyle}>
      <div className="empty-img">
        <img src={emptyImg} alt="" style={imgStyle} />
        <span style={textStyle}>{intl.get('no_data')}</span>
      </div>
    </div>
  );
};

// 存款 APY
export const getDepositApy = item => {
  return BigNumber(item.supplyratePerblock).div(Config.tokenDefaultPrecision).times(Config.blockPerYear).times(100);
};

export const getPrecision = decimal => {
  return BigNumber(10).pow(decimal);
};

// 借款 APY
export const getLendApy = item => {
  return BigNumber(item.borrowratePerblock).div(Config.tokenDefaultPrecision).times(Config.blockPerYear).times(100);
};

// 获取当前块和后端接口返回块高差值
export const getBlockDelta = item => {
  // const nowBlock = await getCurrentBlock();
  const nowBlock = window.nowBlock || 0;
  const lastBlocknum = BigNumber(item.lastBlocknum);
  return BigNumber(nowBlock).minus(lastBlocknum).lt(0) ? 0 : BigNumber(nowBlock).minus(lastBlocknum);
};

// 获取最新借款数量, 返回数据带token精度
export const getTotalBorrowsNew = item => {
  const borrowratePerblock = BigNumber(item.borrowratePerblock);
  const blockDelta = getBlockDelta(item);
  const totalBorrow = BigNumber(item.totalBorrow);

  return borrowratePerblock.times(blockDelta).times(totalBorrow).div(Config.tokenDefaultPrecision).plus(totalBorrow);
};

// 获取最新保证金数量, 返回数据带token精度
export const getTotalReservesNew = item => {
  const borrowratePerblock = BigNumber(item.borrowratePerblock);
  const blockDelta = getBlockDelta(item);
  const totalBorrow = BigNumber(item.totalBorrow);
  const reserveFactor = BigNumber(item.reserveFactor);
  const totalReserve = BigNumber(item.totalReserve);
  // console.log(totalReserve, blockDelta, 'block', borrowratePerblock.times(blockDelta).times(totalBorrow).div(Config.tokenDefaultPrecision).times(reserveFactor).div(Config.tokenDefaultPrecision).plus(totalReserve))
  return borrowratePerblock
    .times(blockDelta)
    .times(totalBorrow)
    .div(Config.tokenDefaultPrecision)
    .times(reserveFactor)
    .div(Config.tokenDefaultPrecision)
    .plus(totalReserve);
};

// 计算兑换率
export const getExchangeRate = item => {
  const totalCash = BigNumber(item.totalCash);
  const totalBorrowsNew = getTotalBorrowsNew(item);
  const totalReservesNew = getTotalReservesNew(item);
  const totalSupply = BigNumber(item.totalSupply);
  // console.log(
  //   totalCash.toString(),
  //   totalBorrowsNew.toString(),
  //   totalReservesNew.toString(),
  //   totalSupply.toString(),
  //   toFixedDown(
  //     totalCash.plus(totalBorrowsNew).minus(totalReservesNew).div(totalSupply).times(Config.tokenDefaultPrecision),
  //     0
  //   ),
  //   'exchangeRate'
  // );
  return BigNumber(
    toFixedDown(
      totalCash.plus(totalBorrowsNew).minus(totalReservesNew).div(totalSupply).times(Config.tokenDefaultPrecision),
      0
    )
  );
};

// 获取已存token数量，返回数据不包括精度
export const getDeposit = item => {
  const exchangeRate = item.exchangeRate || getExchangeRate(item);
  const depositJtoken = BigNumber(item.account_depositJtoken);
  return depositJtoken
    .times(exchangeRate)
    .div(Config.tokenDefaultPrecision)
    .div(item.precision || getPrecision(item.collateralDecimal));
};

// 获取已存usd
export const getDepositUsd = (item, trxPrice) => {
  const deposited = getDeposit(item).times(item.precision || getPrecision(item.collateralDecimal));
  // console.log('getDeposit', deposited);
  trxPrice = BigNumber(trxPrice).div(Config.tokenDefaultPrecision);
  const assetPrice = BigNumber(item.assetPrice).div(Config.tokenDefaultPrecision);
  // console.log(
  //   deposited.toString(),
  //   trxPrice.toString(),
  //   assetPrice.toString(),
  //   deposited.times(assetPrice).times(trxPrice).div(Config.defaultPrecision),
  //   'getDepositUsd'
  // );
  return deposited.times(assetPrice).times(trxPrice).div(Config.defaultPrecision);
};

// 已赚 返回token数量且不带精度
export const getEarned = item => {
  const depositJtoken = BigNumber(item.account_depositJtoken);
  const exchangeRate = item.exchangeRate || getExchangeRate(item);
  const supplyAdded = BigNumber(item.account_supplyAdded);
  const redeemAdded = BigNumber(item.account_redeemAdded);
  const earned = depositJtoken
    .times(exchangeRate)
    .div(Config.tokenDefaultPrecision)
    .minus(supplyAdded)
    .plus(redeemAdded)
    .div(item.precision);
  return earned.lt(0) ? BigNumber(0) : earned;
};

export const getBorrowIndexNew = item => {
  const borrowratePerblock = BigNumber(item.borrowratePerblock);
  const blockDelta = getBlockDelta(item);
  const borrowIndex = BigNumber(item.borrowIndex);
  return borrowratePerblock.times(blockDelta).times(borrowIndex).div(Config.tokenDefaultPrecision).plus(borrowIndex);
};

export const getBorrowBalanceNew = item => {
  const borrowBalance = BigNumber(item.account_borrowBalance);
  const borrowIndex = BigNumber(item.account_borrowIndex);
  if (borrowIndex.eq(0)) return BigNumber(0);
  const borrowIndexNew = getBorrowIndexNew(item);
  // console.log(borrowBalance.toString(), borrowIndex.toString(), borrowIndexNew.toString(), 'getBorrowBalanceNew');
  return borrowBalance.times(borrowIndexNew).div(borrowIndex); // 带token精度
};

// 账户借款USD token->trx->usd 最后div trx decimal
export const getBorrowBalanceNewUsd = (item, trxPrice) => {
  // console.log('trxPrice:', BigNumber(trxPrice).toNumber());
  const borrowBalanceNew = item.borrowBalanceNew || getBorrowBalanceNew(item);
  trxPrice = BigNumber(trxPrice).div(Config.tokenDefaultPrecision);
  const assetPrice = BigNumber(item.assetPrice).div(Config.tokenDefaultPrecision);
  return borrowBalanceNew.times(assetPrice).times(trxPrice).div(Config.defaultPrecision);
};

// 利息
export const getInterest = item => {
  const borrowBalanceNew = item.borrowBalanceNew || getBorrowBalanceNew(item);
  const borrowBalance = BigNumber(item.account_borrowBalance);
  return borrowBalanceNew.minus(borrowBalance).div(item.precision);
};

//获取利息或者已赚的USD单位金额
export const getInterestOrEarnedUsd = (item, trxPrice, isEarned = false) => {
  trxPrice = BigNumber(trxPrice).div(Config.tokenDefaultPrecision);
  const assetPrice = BigNumber(item.assetPrice)
    .div(Config.tokenDefaultPrecision)
    .times(item.precision)
    .div(Config.defaultPrecision);
  // const assetPrice = BigNumber(item.assetPrice).div(Config.tokenDefaultPrecision);
  // temp is interest or earned
  let temp = 1;
  isEarned ? (temp = item.earned || getEarned(item)) : (temp = item.interest || getInterest(item));
  return temp.times(assetPrice).times(trxPrice);
};

// 已存usd总和
export const getDepositJtokenAll = userDataList => {
  let depositJtokenAll = BigNumber(0);
  userDataList.map(item => {
    if (BigNumber(item.deposited_usd).gt(0)) {
      depositJtokenAll = depositJtokenAll.plus(item.deposited_usd);
    }
  });
  // console.log(depositJtokenAll, '4966666666');
  return depositJtokenAll;
};

// 借贷限额, 返回USD
export const getBorrowLimit = (trxPrice, userDataList) => {
  let depositUSDAll = BigNumber(0);
  userDataList.map(_ => {
    if (_.account_entered === 1) {
      // console.log(_.deposited_usd, _.collateralFactor, 'item.deposit_usd')
      _.deposited_usd = getDepositUsd(_, trxPrice);
      // console.log(_.deposited_usd, 'lllllllll');
      const temp = BigNumber(_.deposited_usd).times(_.collateralFactor).div(Config.tokenDefaultPrecision);
      depositUSDAll = depositUSDAll.plus(temp);
    }
  });
  // console.log(depositUSDAll.toString(), 'getBorrowLimit')
  return depositUSDAll;
};

export const getBorrowLimitAfter = (item, priceList, userDataList, tokenValue = BigNumber(0)) => {
  const borrowLimit = getBorrowLimit(priceList, userDataList);
  // console.log(borrowLimit, '5100000000000')
  const assetPrice = BigNumber(getBorrowLimit[item.collateralAddress]).div(Config.tokenDefaultPrecision);
  return borrowLimit.plus(tokenValue.times(item.collateralFactor).times(assetPrice));
};

// 借款占比=应还/借款限额
export const getBorrowPercent = (item, trxPrice, borrowLimit) => {
  const balanceNewUsd = item.borrowBalanceNewUsd || getBorrowBalanceNewUsd(item, trxPrice);
  // const borrowLimit = item.borrowLimit || getBorrowLimit(trxPrice, userDataList);

  // console.log(balanceNewUsd.toString(), borrowLimit, borrowLimit.toString(), balanceNewUsd.div(borrowLimit).times(100));
  return balanceNewUsd.div(borrowLimit).times(100);
};
export const getTotalLendUsd = depositData => {
  let totalUsd = BigNumber(0);
  depositData.map(item => {
    totalUsd = totalUsd.plus(item.borrowBalanceNewUsd);
  });
  return totalUsd;
};

export const amountFormat = (amount, decimal, { miniText = false, needDolar = false } = {}) => {
  if (miniText || miniText === 0) {
    if (BigNumber(amount).gte(0) && BigNumber(amount).lt(miniText)) {
      return `< ${needDolar ? '$' : ''}${miniText}`;
    }
  }
  amount = BigNumber(amount);
  let precision = BigNumber(10).pow(decimal);
  if (amount.gt(1e6)) {
    return `${needDolar ? '$' : ''}${amount
      .div(1e6)
      .times(precision)
      .integerValue(tronWeb.BigNumber.ROUND_DOWN)
      .div(precision)
      .toFixed(decimal)}M`;
  } else if (amount.gt(1e3)) {
    return `${needDolar ? '$' : ''}${amount
      .div(1e3)
      .times(precision)
      .integerValue(tronWeb.BigNumber.ROUND_DOWN)
      .div(precision)
      .toFixed(decimal)}K`;
  }
  return `${needDolar ? '$' : ''}${amount
    .times(precision)
    .integerValue(tronWeb.BigNumber.ROUND_DOWN)
    .div(precision)
    .toFixed(decimal)}`;
};

// 去重并计数
export const deduplication = (dataSource, value) => {
  let arr = dataSource.map(item => {
    let obj = {
      name: item[value],
      state: item['state']
    };
    return obj;
  });
  var newArr = [];
  for (var i = 0; i < arr.length; i++) {
    var temp = arr[i].name;
    var count = 0;
    for (var j = 0; j < arr.length; j++) {
      if (arr[j].name == temp) {
        count++;
        arr[j].name = -1;
      }
    }
    if (temp != -1) {
      let obj = {
        intl: temp,
        count,
        state: arr[i].state
      };
      newArr.push(obj);
    }
  }
  return newArr;
};

export const renderBalance = (item, balanceInfo, decimals = 6) => {
  try {
    const { jtokenAddress, precision, collateralSymbol } = item;
    if (balanceInfo[jtokenAddress] && balanceInfo[jtokenAddress].balance) {
      return (
        <span>
          {formatNumber(balanceInfo[jtokenAddress].balance.div(precision), decimals)} {item.collateralSymbol}
        </span>
      );
    } else {
      return <span>--</span>;
    }
  } catch (err) {
    return <span>--</span>;
  }
};

export const renderBorrowLimit = (borrowLimit, item) => {
  return (
    <span>
      <span className="c-84869E fw700">
        {'$'} {formatNumber(borrowLimit, 2, { miniText: 0.01 })} {' -> '}
      </span>
      {'$'} {formatNumber(borrowLimitAfter, 2, true, 0.01)}
    </span>
  );
};

export const renderProgress = (per, { threshold = 80, showInfo = true, reverse = false } = {}) => {
  const colorBlue = '#3D56D6';
  const colorRed = '#D84B79';
  const trailColor = '#F0F1F6';
  if (BigNumber(per).gte(threshold)) {
    return (
      <Progress
        percent={per}
        strokeColor={colorRed}
        trailColor={trailColor}
        format={percent => <span style={{ color: colorRed }}>{percent}%</span>}
        strokeWidth={4}
        showInfo={showInfo}
        className={reverse ? 'reverse' : ''}
      ></Progress>
    );
  }
  return (
    <Progress
      percent={per}
      strokeColor={colorBlue}
      trailColor={trailColor}
      format={percent => <span style={{ color: colorBlue }}>{percent}%</span>}
      strokeWidth={4}
      showInfo={showInfo}
      className={reverse ? 'reverse' : ''}
    ></Progress>
  );
};

export const checkEnteredMarket = (userList, jtokenAddress) => {
  try {
    return userList && userList[jtokenAddress] && userList[jtokenAddress].account_entered === 1;
  } catch (err) {
    return false;
  }
};

export const gtBalance = (value, balance, precision = 1) => {
  try {
    return BigNumber(value).gt(BigNumber(balance).div(precision));
  } catch (err) {
    return false;
  }
};

export const eqBalance = (value, balance, precision = 1) => {
  try {
    return BigNumber(value).eq(BigNumber(balance).div(precision));
  } catch (err) {
    return false;
  }
};

export const renderPercent = (
  value,
  {
    gt0 = true,
    multi100 = false,
    needPerSymbol = true,
    miniText = 0.01,
    decimal = 2,
    cutZero = true,
    keep0 = false
  } = {}
) => {
  try {
    if (multi100) {
      value = BigNumber(value).times(100);
    }
    if (gt0 && BigNumber(value).gt(100)) {
      value = BigNumber(100);
    }
    if (keep0 && BigNumber(value).eq(0)) return 0 + (needPerSymbol ? '%' : ''); // 0就显示0%
    return formatNumber(value, decimal, { miniText, per: true, cutZero }) + (needPerSymbol ? '%' : '');
  } catch (err) {
    return '';
  }
};

export const checkCash = async (value, popData) => {
  const { balance = 0, success } = await getCash(popData.jtokenAddress);
  if (success) {
    return BigNumber(value).times(popData.precision).gt(balance);
  }
  return false;
};

export const myLocal = {
  set: (key, value) => {
    if (!window.localStorage) {
      return false;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  get: key => {
    try {
      if (!window.localStorage) {
        return false;
      }
      var cacheVal = window.localStorage.getItem(key);
      var result = JSON.parse(cacheVal);
      var now = new Date() - 1;
      if (!result) {
        return null;
      } //缓存不存在
      if (now > result.exp) {
        //缓存过期
        window.localStorage.removeItem(key);
        return '';
      }
      return result.val;
    } catch (e) {
      window.localStorage.removeItem(key);
      return null;
    }
  }
};

export const getPercent = (v1, v2, flag = true) => {
  if (BigNumber(v1).eq(0)) {
    return BigNumber(0);
  }
  if (BigNumber(v2).eq(0)) {
    return flag ? BigNumber(0) : BigNumber(100);
  }
  return BigNumber(v1).div(v2).times(100);
};

export const getJTokenLogo = collateralSymbol => {
  collateralSymbol = String(collateralSymbol).toLowerCase();
  let icons = '';
  try {
    icons = require(`../assets/images/icons/lend_${collateralSymbol.toLowerCase()}.svg`);
  } catch (error) {
    icons = require(`../assets/images/default.svg`);
  }
  return icons;
};

export const getLogo = symbol => {
  if (symbol === 'JSTNEW') {
    symbol = 'JST';
  }
  symbol = String(symbol).toLowerCase();
  let icons = '';
  try {
    icons = require(`../assets/images/icons/${symbol.toLowerCase()}.png`);
  } catch (error) {
    try {
      icons = require(`../assets/images/icons/${symbol.toLowerCase()}.svg`);
    } catch (error) {
      icons = require(`../assets/images/default.svg`);
    }
  }
  return icons;
};

export const getTotalApy = (item, assetList) => {
  let depositApy = '--';
  let mintApy = '--';
  let totalApy = '--';
  // const miningStart = true;
  // console.log(item, assetList, 'assetlist');
  try {
    depositApy = item.depositedAPY ? BigNumber(item.depositedAPY).times(100) : getDepositApy(item);
    // if (miningStart) {
    mintApy = assetList[item.jtokenAddress] ? assetList[item.jtokenAddress].totalAPYNEW : '--';
    // } else {
    //   mintApy = assetList[item.jtokenAddress] ? assetList[item.jtokenAddress].apy : '--';
    // }
    if (mintApy !== '--') {
      // totalApy = depositApy;
      totalApy = depositApy.plus(mintApy);
    }
  } catch (error) {
    console.log(`getTotalApy error:`, error);
  }

  return {
    depositApy,
    mintApy,
    totalApy
  };
};

export const getGainNewAndOld = (depositData, usertronbullishData, currency) => {
  try {
    // depositData 已经是所有的pools了，只是命名没有改 03-15
    // console.log('depositData', depositData, 'usertronbullishData', usertronbullishData, 'currency', currency);
    if (!usertronbullishData) {
      return {
        gainNewAll: '--',
        gainOldAll: '--',
        price: '--'
      };
    }
    let gainNewAll = BigNumber(0);
    let gainOldAll = BigNumber(0);
    let price = BigNumber(0);
    let depositDataKeys = Object.keys(depositData);
    depositDataKeys.map((item, index) => {
      if (usertronbullishData[item] && usertronbullishData[item][currency]) {
        gainNewAll = gainNewAll.plus(BigNumber(usertronbullishData[item][currency].gainNew));
        gainOldAll = gainOldAll.plus(BigNumber(usertronbullishData[item][currency].gainOld));

        if (index == 0) {
          price = BigNumber(usertronbullishData[item][currency].price);
        }
      }
    });
    return {
      gainNewAll,
      gainOldAll,
      price
    };
  } catch (err) {
    console.log('err', err);
    return {
      gainNewAll: '--',
      gainOldAll: '--',
      price: '--'
    };
  }
};

export const getTransferringSoonAndInFreeze = (currencyData = {}) => {
  try {
    if (currencyData.length) {
      let transferringSoon = BigNumber(0);
      let inFreeze = BigNumber(0);
      currencyData.map(item => {
        transferringSoon = transferringSoon.plus(BigNumber(item.gainNew).times(item.price));
        inFreeze = inFreeze.plus(BigNumber(item.gainOld).times(item.price));
      });
      return {
        transferringSoon,
        inFreeze
      };
    } else {
      return {
        transferringSoon: '--',
        inFreeze: '--'
      };
    }
  } catch (error) {
    console.log('getTransferringSoonOrInFreeze error:', error);
    return {
      transferringSoon: '--',
      inFreeze: '--'
    };
  }
};

export const getNetAPY = (depositData = [], lendData = [], assetList = []) => {
  try {
    if (depositData.length && Object.keys(assetList).length) {
      let deposit = bigNumber(0);
      let lend = bigNumber(0);
      let depositTotalUsd = bigNumber(0); //总存款

      depositData.map(item => {
        const cumulativeAPY = bigNumber(assetList[item.jtokenAddress].totalAPYNEW).plus(item.depositApy).div(100);
        depositTotalUsd = depositTotalUsd.plus(bigNumber(item.deposited_usd));
        deposit = deposit.plus(item.deposited_usd.times(cumulativeAPY));
      });

      if (depositTotalUsd.eq(0)) {
        return 0;
      }

      if (lendData.length) {
        lendData.map(item => {
          lend = lend.plus(item.borrowBalanceNewUsd.times(item.lendApy.div(100)));
        });
      }
      // console.log('deposit',deposit.toString(),'lend',lend.toString(),'depositTotalUsd',depositTotalUsd.toString());
      return deposit.minus(lend).div(depositTotalUsd);
    }
  } catch (error) {
    console.log('getNetAPY error:', error);
    return 0;
  }
};
