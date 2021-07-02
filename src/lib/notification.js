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