import {initializeContext} from "../index";
import {createUserAccountIfNotExist} from "../utils/accounts";

initializeContext().then((context) => {
    createUserAccountIfNotExist(context).then((res) => {
        console.log(res);
    }).catch((err) => {
        console.error(err);
    })
})