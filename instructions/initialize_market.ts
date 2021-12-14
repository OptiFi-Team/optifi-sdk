import { BN, web3 } from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import Context from "../types/context";

/**
 * Create a new serum market, with the specified authority
 *
 * @param context Program context
 * @param authority Authority Public Key
 * @param pruneAuthority Prune Authority Public Key
 * @param coinLotSize Coin Lot Size
 * @param lotSize Lot Size
 * @param vaultSignerNonce Vault Signer Nonce
 * @param dustThreshold Dust Threshold
 * @param mintPK mintPK
 */
export default async function initializeMarket(
    context: Context,
    authority: PublicKey,
    pruneAuthority: PublicKey, 
    coinLotSize: BN,
    lotSize: BN,
    vaultSignerNonce: BN,
    dustThreshold: BN,
    mintPK: PublicKey) {

    let new_token_mint = web3.Keypair.generate();

    let coinVaultWallet = web3.Keypair.generate();
    let coinVaultPk = coinVaultWallet.publicKey;

    let pcVaultWallet = web3.Keypair.generate();
    let pcVaultPk = pcVaultWallet.publicKey;

    let marketWallet = web3.Keypair.generate();
    let market = marketWallet.publicKey;

    let bidsWallet = web3.Keypair.generate();
    let bidsPk = bidsWallet.publicKey;

    let asksWallet = web3.Keypair.generate();
    let asksPk = asksWallet.publicKey;

    let reqQWallet = web3.Keypair.generate();
    let reqQPk = reqQWallet.publicKey;

    let eventQWallet = web3.Keypair.generate();
    let eventQPk = eventQWallet.publicKey;


    const initialized_market = await context.program.rpc.initializeMarket(
        authority,
        pruneAuthority,
        coinLotSize,
        lotSize,
        vaultSignerNonce,
        dustThreshold,
        {
          accounts: {
            market,
            tokenMint: new_token_mint.publicKey,
            mintPK,
            coinVaultPk,
            pcVaultPk,
            bidsPk,
            asksPk,
            reqQPk,
            eventQPk,
            systemProgram: web3.SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
            programId: context.program.programId,
          },
          signers: [
            reqQWallet,
            eventQWallet,
            asksWallet,
            bidsWallet,
            context.user,
          ],
          instructions: [
            /// try to create remaining required accounts
            web3.SystemProgram.createAccount({
              fromPubkey: context.user.publicKey,
              newAccountPubkey: reqQPk,
              space: 5132,
              lamports: 
                await context.program.provider.connection.getMinimumBalanceForRentExemption(
                  5132
                ),
              programId: context.program.programId,
            }),
            web3.SystemProgram.createAccount({
              fromPubkey: context.user.publicKey,
              newAccountPubkey: eventQPk,
              space: 262156,
              lamports:
                await context.program.provider.connection.getMinimumBalanceForRentExemption(
                  262156
                ),
            programId: context.program.programId,
            }),
            web3.SystemProgram.createAccount({
              fromPubkey: context.user.publicKey,
              newAccountPubkey: bidsPk,
              space: 65548,
              lamports:
                await context.program.provider.connection.getMinimumBalanceForRentExemption(
                  65548
                ),
            programId: context.program.programId,
            }),
            web3.SystemProgram.createAccount({
              fromPubkey: context.user.publicKey,
              newAccountPubkey: asksPk,
              space: 65548,
              lamports:
                await context.program.provider.connection.getMinimumBalanceForRentExemption(
                  65548
                ),
              programId: context.program.programId,
            }),
          ],
        }
      );

      return initialized_market;
}