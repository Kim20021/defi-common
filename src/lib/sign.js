export const sign = async transaction => {
  try {
    const tronweb = window.tronWeb;
    const signedTransaction = await tronweb.trx.sign(transaction.transaction);
    return signedTransaction;
  } catch (error) {
    console.log(error, 'signerr');
    throw new Error(error);
  }
};