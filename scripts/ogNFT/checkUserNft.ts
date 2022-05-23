import { initializeContext } from "../../index";
import { checkIfUserHasOgNft } from "../../utils/ogNft";

initializeContext().then(async (context) => {

    let hasNft = await checkIfUserHasOgNft(context)

    console.log(hasNft)
})
