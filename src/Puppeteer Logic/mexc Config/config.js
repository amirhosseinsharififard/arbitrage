export const MEXC_FUTURES_URL = "https://www.mexc.com/futures/DEBT_USDT";

export const mexcSelectors = {
    // Login state detection: if BOTH loginButton and registerButton exist → user is NOT logged in
    loginButton: "html.webp body div#futures-v3-remote-header div.RemoteHeader_remoteHeaderContainer__LvYDj div div._remoteHeader_19nab_1165.remote-header-content div#globalNav._wrapper_19nab_2.RemoteHeader_tradeBackground__3gCgb.responsive-wrapper div._rightWrapper_19nab_146 div.responsive-item.responsive-item-visible div.responsive-item-container div.responsive-item-content div._navItem_19nab_197._loginNavItem_19nab_30 a._loginBtn_19nab_35._authBtn_19nab_176",
    registerButton: "html.webp body div#futures-v3-remote-header div.RemoteHeader_remoteHeaderContainer__LvYDj div div._remoteHeader_19nab_1165.remote-header-content div#globalNav._wrapper_19nab_2.RemoteHeader_tradeBackground__3gCgb.responsive-wrapper div._rightWrapper_19nab_146 div.responsive-item.responsive-item-visible div.responsive-item-container div.responsive-item-content div._navItem_19nab_197._registerNavItem_19nab_101 a._registerBtn_19nab_41._authBtn_19nab_176._hasBonus_19nab_56",
    // Positive indicator of logged-in state (XPath)
    loggedInIndicator: "xpath://*[@id=\"globalNav\"]/div[2]/div[7]/div/div/div/svg",

    // Token quantity input field inside order form
    tokenQuantityInput: "html.webp body div section._symbol__contractPage__dwlDC div.react-grid-layout._symbol__content__8PrIJ._symbol__verticalLayout__dO1KG.mx-grid-layout-wrapper div#orderForm.react-grid-item._symbol__gridLayoutOrderForm__YUj4C.react-draggable.cssTransforms.react-resizable section#mexc-web-inspection-futures-exchange-orderForm.handle_handleContainer__5hpMx._symbol__orderFormContentWrapper__rpcRx div.handle_handleWrapper__z38yY div#mexc-web-handle-content-wrapper-v div div#mexc_contract_v_open_position div.component_container__axBbD div.component_inputWrapper__LP4Dm div.component_numberInput__PF7Vf div.InputNumberHandle_inputNumberExtendV2Wrapper__Ns_8m div.InputNumberHandle_inputOuterWrapper__8w_l1 div.InputNumberHandle_inputWrapper__Kntgy.input-wrapper div.InputNumberExtend_wrapper__qxkpD.extend-wrapper input.ant-input",

    // Tabs toggles (standardized naming)
    openToggleButton: "html.webp body div section._symbol__contractPage__dwlDC div.react-grid-layout._symbol__content__8PrIJ._symbol__verticalLayout__dO1KG.mx-grid-layout-wrapper div#orderForm.react-grid-item._symbol__gridLayoutOrderForm__YUj4C.react-draggable.cssTransforms.react-resizable section#mexc-web-inspection-futures-exchange-orderForm.handle_handleContainer__5hpMx._symbol__orderFormContentWrapper__rpcRx div.handle_tabs__v1Grn div.handle_vInner__aV1YW span.handle_active__Yy6UA",
    closeToggleButton: "html.webp body div section._symbol__contractPage__dwlDC div.react-grid-layout._symbol__content__8PrIJ._symbol__verticalLayout__dO1KG.mx-grid-layout-wrapper div#orderForm.react-grid-item._symbol__gridLayoutOrderForm__YUj4C.react-draggable.cssTransforms.react-resizable section#mexc-web-inspection-futures-exchange-orderForm.handle_handleContainer__5hpMx._symbol__orderFormContentWrapper__rpcRx div.handle_tabs__v1Grn div.handle_vInner__aV1YW span.handle_active__Yy6UA",

    // Action buttons (explicit selectors – XPath by visible text)
    openLongButton: "xpath://button[normalize-space(.)='Open Long'] | //span[normalize-space(.)='Open Long']/ancestor::button[1]",
    openShortButton: "xpath://button[normalize-space(.)='Open Short'] | //span[normalize-space(.)='Open Short']/ancestor::button[1]",
    closeShortButton: "xpath://button[normalize-space(.)='Close Short'] | //span[normalize-space(.)='Close Short']/ancestor::button[1]",
    closeLongButton: "xpath://button[normalize-space(.)='Close Long'] | //span[normalize-space(.)='Close Long']/ancestor::button[1]",

    // Optional scope containers to narrow search
    openContainer: "#mexc_contract_v_open_position",
    closeContainer: null,

    // Alternative actions if needed (bid/ask semantics)
    bidButton: null,
    askButton: null
};

// Fallback visible text candidates for locating buttons when explicit selectors are not set
export const mexcButtonTexts = {
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