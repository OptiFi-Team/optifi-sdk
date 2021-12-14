
export default interface InstructionResult<T> {
    successful: boolean,
    data?: T,
    error?: string
}