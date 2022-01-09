import fs from "fs";
import {WalletProvider} from "../types/solanaTypes";
import * as anchor from "@project-serum/anchor";
import Asset from "../types/asset";
import {
    Asset as OptifiAsset,
    ExpiryType as OptifiExpiryType,
    InstrumentType as OptifiInstrumentType
} from '../types/optifi-exchange-types';
import InstrumentType from "../types/instrumentType";
import ExpiryType from "../types/expiryType";

/**
 * Small helper function to read a JSON file as a type from a filepath
 *
 * @param filePath The path to read the data from
 */
export function readJsonFile<T>(filePath: string): T {
    let strData = fs.readFileSync(filePath);
    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf-8"
        )
    )
}

export function isWalletProvider(object: unknown): object is WalletProvider {
    return Object.prototype.hasOwnProperty.call(object, "name")
        && Object.prototype.hasOwnProperty.call(object, "url");
}

export function generateUuid(): string {
    return anchor.web3.Keypair.generate()
        .publicKey.toBase58()
        .slice(0, 6);
}

export function dateToAnchorTimestamp(date?: Date): anchor.BN {
    return date ?
        new anchor.BN(date.getTime() / 1000)
        : new anchor.BN(1)
}

export function dateToAnchorTimestampBuffer(date?: Date): Buffer {
    return dateToAnchorTimestamp(date).toArrayLike(Buffer, "be", 8)
}

export function assetToOptifiAsset(asset: Asset): OptifiAsset {
    switch (asset) {
        case Asset.Bitcoin:
            return OptifiAsset.Bitcoin;
        case Asset.Ethereum:
            return OptifiAsset.Ethereum;
    }
}

export function optifiAssetToNumber(asset: OptifiAsset): number {
    switch (asset) {
        case OptifiAsset.Bitcoin:
            return 0;
        case OptifiAsset.Ethereum:
            return 1;
        case OptifiAsset.USDC:
            return 2;
        default:
            return -1;
    }
}


export function expiryTypeToNumber(expiryType: OptifiExpiryType): number {
    switch (expiryType) {
        case OptifiExpiryType.Standard:
            return 0;
        case OptifiExpiryType.Perpetual:
            return 1;
        default:
            return -1;
    }
}

export function instrumentTypeToNumber(instrumentType: OptifiInstrumentType): number {
    switch (instrumentType) {
        case OptifiInstrumentType.Put:
            return 0;
        case OptifiInstrumentType.Call:
            return 1;
        case OptifiInstrumentType.Future:
            return 2;
        default:
            return -1;
    }
}

export function instrumentTypeToOptifiInstrumentType(instrumentType: InstrumentType): OptifiInstrumentType {
    switch (instrumentType) {
        case InstrumentType.Call:
            return OptifiInstrumentType.Call;
        case InstrumentType.Put:
            return OptifiInstrumentType.Put;
        case InstrumentType.Future:
            return OptifiInstrumentType.Future;
    }
}

export function expiryTypeToOptifiExpiryType(expiryType: ExpiryType): OptifiExpiryType {
    switch (expiryType) {
        case ExpiryType.Perpetual:
            return OptifiExpiryType.Perpetual;
        case ExpiryType.Standard:
            return OptifiExpiryType.Standard;
    }
}