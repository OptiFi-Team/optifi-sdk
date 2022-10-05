import { USDC_DECIMALS } from "../../constants";
import { initializeContext } from "../../index";
import claimRebate from "../../instructions/user/claimRebate";
import { FeeTier } from "../../types/optifi-exchange-types";
import { getRefereeFeeAccounts } from "../../utils/accounts";

initializeContext().then(async (context) => {
  let refereeFeeAccounts = await getRefereeFeeAccounts(context, context.provider.wallet.publicKey);

  refereeFeeAccounts.forEach(({ publicKey, accountInfo }) => {
    console.log("refereeFeeAccount: ", publicKey.toString());

    let openOrderFeeRebate = 0;
    // @ts-ignore
    accountInfo.openOrderFee.forEach((e) => {
      openOrderFeeRebate += e.fee * 0.1;
    });

    console.log("accRebateFee: ", accountInfo.accRebateFee / 10 ** USDC_DECIMALS);
    console.log("openOrderFeeRebate: ", openOrderFeeRebate / 10 ** USDC_DECIMALS);
    console.log("Claimable Rebate: ", (accountInfo.accRebateFee - openOrderFeeRebate) / 10 ** USDC_DECIMALS);

    claimRebate(context, publicKey)
      .then((res) => {
        console.log("Got init res", res);
      })
      .catch((err) => {
        console.error(err);
      });
  });
});
