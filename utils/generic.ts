import fs from "fs";
import { WalletProvider } from "../types/solanaTypes";

/**
 * Small helper function to read a JSON file as a type from a filepath
 *
 * @param filePath The path to read the data from
 */
export function readJsonFile<T>(filePath: string): T {
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