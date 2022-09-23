import { initializeContext } from "../../index";
import updateIv from "../../instructions/marginStress/updateIv";
import { sleep } from "../../utils/generic";

initializeContext().then(async (context) => {
    while (true) {

        let dateTime = new Date()
        console.log(dateTime);

        updateIv(context).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.error(err);
        })

        await sleep(5 * 60 * 1000)
    }
})