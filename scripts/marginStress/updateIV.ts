import { initializeContext } from "../../index";
import updateIv from "../../instructions/marginStress/updateIv";

initializeContext().then((context) => {
    updateIv(context).then((res) => {
        console.log(res);
    }).catch((err) => {
        console.error(err);
    })
})