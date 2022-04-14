enum OrderType {
    Limit = 0,
    ImmediateOrCancel = 1,
    PostOnly = 2,
}

export default OrderType;


export function orderTypeToNumber(orderType: OrderType): number {
    switch (orderType) {
        case OrderType.Limit:
            return 0;
        case OrderType.ImmediateOrCancel:
            return 1;
        case OrderType.PostOnly:
            return 2;
    }
}