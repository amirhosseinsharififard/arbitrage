export const LBANK_FUTURES_URL = "https://www.lbank.com/futures/debtusdt";

export const lbankSelectors = {
    // Login state detection: if BOTH loginButton and registerButton exist → NOT logged in
    loginButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru header.sc-ddsBQL.creOle.lbank-header div.sc-gVzlyS.bOAGOz div.sc-dSyEWX.iMrMGA.header-right a button.sc-dIfARi.NrEWd.sc-fyBusP.klnJLS.login-button.lbank-btn.lbank-btn-secondary.lbank-btn-round.lbank-btn-ghost.lbank-btn-hovered span.sc-idXgbr.cBSEVq",
    registerButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru header.sc-ddsBQL.creOle.lbank-header div.sc-gVzlyS.bOAGOz div.sc-dSyEWX.iMrMGA.header-right a button.sc-dIfARi.NrEWd.sc-bGhRYA.iUuJhi.register-button.lbank-btn.lbank-btn-brand.lbank-btn-round.lbank-btn-hovered span.sc-idXgbr.cBSEVq",
    // Positive indicator of logged-in state (avatar etc.). Supports both CSS or prefix with "xpath:" for XPath
    loggedInIndicator: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru header.sc-eZceyY.dUA-dID.lbank-header div.sc-MAqyW.grtnhR div.sc-cbfGDZ.guSjua.header-right div.sc-bTtZEv.jvZgKX.sc-fYyKnq.gygAhZ span.sc-hQIyOC.cSvkLn a.sc-fSKiAx.jVCpYC.a-link img.sc-bkldj.grEAWS",

    // Token quantity input field inside order form
    tokenQuantityInput: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.futures_orderboard_content div.futures_orderboard_forms div.sc-dOGYXd.cinBsS.orderboard_form div.sc-bnfANK.iDdiMQ.mini_form_item.sc-eTZVu.cnMLga.amount_form_item.val_len_0 div.sc-cCjUiG.knpFjn.sc-cOxWqc.gpBAMC.mini_form_input.lbank-input-number.lbank-input.lbank-input-large.lbank-input-outlined input.sc-hhOBVt.jHZCup.lbank-input-core.lbank-input-has-affter",

    // Toggle Open tab
    openToggleButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.index_lbk-row__VKjuM.index_lbk-toggle__tphea.sc-fIXfXT.jYMNkb.open_close_toggle button.index_lbk-toggle-button__v6Loz.open_close_btn.index_selected__KFvWG.open_close_btn_selected",

    // Action buttons (explicit selectors – can be CSS or XPath if prefixed with "xpath:")
    openLongButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.futures_orderboard_content div.sc-iMGJAB.gzEegW.orderboard_buttons div.sc-hhoQlF.gCpNIE.orderboard_flexible_values.one_line.buttons div.info div.btnOpen span.text",
    openShortButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.futures_orderboard_content div.sc-iMGJAB.gzEegW.orderboard_buttons div.sc-hhoQlF.gCpNIE.orderboard_flexible_values.one_line.buttons div.info div.btnClose span.text",

    closeToggleButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.sc-iMGJAB.gzEegW.orderboard_buttons div.sc-hhoQlF.gCpNIE.orderboard_flexible_values.one_line.buttons div.info div.btnClose span.text",
    closeShortButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.futures_orderboard_content div.sc-iMGJAB.gzEegW.orderboard_buttons div.sc-hhoQlF.gCpNIE.orderboard_flexible_values.one_line.buttons div.info div.btnClose span.text",
    closeLongButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru main.sc-bJjNXm.eWvQZs.lbk-trading-layout-main.horizontal section.sc-gcxUDs.bdlywA.trading_block.vertical section.sc-gcxUDs.bdlywA.trading_block.vertical div.sc-fWQKxP.bOKXsY.lbank-tabs.lbank-tabs-top.sc-kmtlux.fkbggY.orderboard_tabs.futures_orderboard_tabs div.sc-caPbAK.ctJcbQ.lbank-tabs-tabpane-content-holder div.lbank-tabs-tabpane-content.lbank-tabs-tabpane-content-top div.lbank-tabs-tabpane.lbank-tabs-tabpane-active div.sc-hEBzJi.giGBGG.futures_orderboard div.futures_orderboard_content div.sc-iMGJAB.gzEegW.orderboard_buttons div.sc-hhoQlF.gCpNIE.orderboard_flexible_values.one_line.buttons div.info div.btnOpen span.text",

    // Optional scope containers to narrow search
    openContainer: null,
    closeContainer: null,

    // Alternative actions if needed (bid/ask semantics)
    bidButton: null,
    askButton: null
};

// Fallback visible text candidates for locating buttons when explicit selectors are not set
export const lbankButtonTexts = {
    openLong: [
        "Open Long", "Long", "Buy",
        "باز کردن لانگ", "لانگ", "خرید"
    ],
    openShort: [
        "Open Short", "Short", "Sell",
        "باز کردن شورت", "شورت", "فروش"
    ],
    closeLong: [
        "Close Long", "Close Long Position", "Close Buy", "Close Longs", "Close",
        "بستن لانگ", "بستن موقعیت لانگ", "بستن خرید"
    ],
    closeShort: [
        "Close Short", "Close Short Position", "Close Sell", "Close Shorts", "Close",
        "بستن شورت", "بستن موقعیت شورت", "بستن فروش"
    ],
};