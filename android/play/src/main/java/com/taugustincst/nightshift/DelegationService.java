package com.taugustincst.nightshift;

import com.google.androidbrowserhelper.playbilling.digitalgoods.DigitalGoodsRequestHandler;

/**
 * Chrome's connection back into the app. Registering the Digital Goods
 * handler is what makes {@code window.getDigitalGoodsService} answer on the
 * page, and so what lets js/billing.js read the unlock and the purchases.
 */
public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        registerExtraCommandHandler(new DigitalGoodsRequestHandler(getApplicationContext()));
    }
}
