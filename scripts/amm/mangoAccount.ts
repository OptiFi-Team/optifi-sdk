import { initializeContext } from "../../index";
import { syncAmmPositions, syncAmmFuturePositions, updateAmmFutureOrders } from "./utils";
import { MangoClient , MangoCache, MangoCacheLayout} from "@blockworks-foundation/mango-client";
import { MANGO_GROUP_ID, MANGO_PROGRAM_ID } from "../../constants";
import { PublicKey } from "@solana/web3.js";
import { getAmmLiquidityAuthPDA, getMangoAccountPDA } from "../../utils/pda";
import { ammIndex } from "./constants";

initializeContext().then(async (context) => {
    let mangoProgramId = new PublicKey(MANGO_PROGRAM_ID[context.cluster])
    let mangoGroup = new PublicKey(MANGO_GROUP_ID[context.cluster])
    let client = new MangoClient(context.connection, mangoProgramId);
    let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);
    let [ammMangoAccountAddress,] = await getMangoAccountPDA(mangoProgramId, mangoGroup, ammLiquidityAuth, ammIndex)


    let mangoAccountInfo = await client.getMangoAccount(ammMangoAccountAddress, mangoProgramId)
    console.log("mangoAccountInfo: ", mangoAccountInfo)
    console.log("mangoAccountInfo: ", mangoAccountInfo.perpAccounts[1].basePosition.toString())

    let owner = new PublicKey("CX8JvnKzZVNqGtxzcmN3H7JdVFT6hgHtiRjidJdSMTNZ")

    let mangoGroupAccountInfo = await client.getMangoGroup(mangoGroup)

    let mangoAccounts = await client.getMangoAccountsForOwner(mangoGroupAccountInfo, owner, true)
    let mymangoAccount = mangoAccounts[0]
    console.log("mangoAccounts: ", mymangoAccount.perpAccounts[1].basePosition.toString())
//   MangoCacheLayout.decode()
//   mymangoAccount.
// mymangoAccount.getAvailableBalance(mangoGroup,  )
// mymangoAccount.get


})
