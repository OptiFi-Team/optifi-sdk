import * as fs from "fs";

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