import Context from '../types/context'
import { getAllUsersOnExchange } from '../utils/accounts'
import {initializeContext} from '../index'

import {fetchDataOnRegularBasis} from '../utils/fetchDataOnRegularBasis'

(async () => {
    let context = await initializeContext()
    let allUsers = await getAllUsersOnExchange(context)

    let tempUsers = allUsers

    // let result = await fetchDataOnRegularBasis(context, [tempUsers[0].publicKey])
    // console.log(result)
    
    let tempUsersPub = tempUsers.map(user => user.publicKey)
    fetchDataOnRegularBasis(context, tempUsersPub).then(res => {
        res.map(user => {
           console.log(user, '-----------\n')
        })
    })
})();