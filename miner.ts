import { Address, beginCell, Cell, internal, toNano } from '@ton/core'
import {getSecureRandomBytes, mnemonicToPrivateKey, mnemonicToWalletKey} from '@ton/crypto'
import { execSync } from 'child_process';
import fs from 'fs'
import {TonClient, TonClient4, WalletContractV4} from '@ton/ton';
import dotenv from 'dotenv'

import {getHttpEndpoint} from "@orbs-network/ton-access";

dotenv.config()

type Giver = { address: string, reward: bigint }

function parseGivers(): Giver[] {
    const raw = process.env.ZKGRM_GIVERS || process.env.GIVERS || '';
    const givers = raw.split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const [address, reward = '0'] = item.split(':').map((part) => part.trim());
            Address.parse(address);
            return { address, reward: BigInt(reward) };
        });

    if (givers.length === 0) {
        throw new Error('Set ZKGRM_GIVERS in .env, for example: ZKGRM_GIVERS=EQ...:100000000000,EQ...:1000000000000');
    }
    return givers;
}

function appendRewardRecipient(body: Cell, sender: Address, recipient: Address): Cell {
    if (sender.equals(recipient)) {
        return body;
    }
    return beginCell()
        .storeSlice(body.beginParse())
        .storeRef(beginCell().storeAddress(recipient).endCell())
        .endCell();
}

const givers = parseGivers();
let bestGiver: Giver = givers[0];

let go = true
let i = 0
async function main() {


    const endpoint1 = await getHttpEndpoint({
        network: "mainnet",
    });
    const client1 = new TonClient({ endpoint:endpoint1 });
    let endpoint4 = "https://mainnet-v4.tonhubapi.com";
    const client4 = new TonClient4({ endpoint:endpoint4 });
    let ownerMnemonics = (process.env.MNEMONIC || "").toString();
    let ownerKeyPair = await mnemonicToPrivateKey(ownerMnemonics.split(" "));
    let ownerTonWallet = WalletContractV4.create({
        workchain: 0,
        publicKey: ownerKeyPair.publicKey,
    });

    let openedWallet = client4.open(ownerTonWallet);
    while (go) {
        bestGiver = givers[Math.floor(Math.random() * givers.length)]
        const giverAddress = bestGiver.address
        const powInfo = await client1.runMethod(Address.parse(giverAddress), 'get_pow_params')
        let tupleReader = powInfo.stack;
        const seed = tupleReader.readBigNumber()
        const complexity = tupleReader.readBigNumber()
        const amount = tupleReader.readBigNumber()
        tupleReader.readBigNumber() // target_delta, GRM-compatible fourth value

        const targetAddress = process.env.TARGET_ADDRESS
            ? Address.parse(process.env.TARGET_ADDRESS)
            : ownerTonWallet.address;

        const randomName = (await getSecureRandomBytes(8)).toString('hex') + '.boc'
        const path = `./bocs/${randomName}`
        // const command1 = `.\\pow-miner-cuda.exe -g 0 -F 128 -t 5 ${ownerTonWallet.address.toString({ urlSafe: true, bounceable: true })} ${seed} ${complexity} ${iterations} ${giverAddress} ${path}`
        const command = `./pow-miner -vv -w7 -t100 ${targetAddress.toString({ urlSafe: true, bounceable: true })} ${seed} ${complexity} ${amount} ${giverAddress} ${path}`
        console.info(command)
        try {
            const output = execSync(command, { encoding: 'utf-8', stdio: "pipe" });  // the default is 'buffer'
        } catch (e) {
            console.error(e)
        }
        let mined: Buffer | undefined = undefined
        try {
            mined = fs.readFileSync(path)
            fs.rmSync(path)
        } catch (e) {
            //
        }
        if (!mined) {
            console.log(`${new Date()}: not mined`, seed, i++)
        }
        if (mined) {
            console.info("================")
            try {
                console.info(Cell.fromBoc(mined));
            } catch (e){
                console.error("!!! Fail to run Cell.fromBoc(mined) !!")
                console.info("++++++++++++++++++++++++")
                continue
            }


            const powInfo2 = await client1.runMethod(Address.parse(giverAddress), 'get_pow_params')
            let tupleReader2 = powInfo2.stack;
            const newSeed = tupleReader2.readBigNumber()
            if (newSeed !== seed) {
                console.log('Mined already too late seed')
                continue
            }

            console.log(`${new Date()}:     mined`, seed, i++)

            let seqno = 0
            try {
                seqno = (await openedWallet.getSeqno())
            } catch (e) {
                console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! getSeqno FAIL !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            }
            for (let j = 0; j < 5; j++) {
                try {
                    openedWallet.sendTransfer({
                        seqno,
                        secretKey: ownerKeyPair.secretKey,
                        messages: [internal({
                            to: giverAddress,
                            value: toNano('0.05'),
                            bounce: true,
                            body: appendRewardRecipient(Cell.fromBoc(mined)[0].asSlice().loadRef(), ownerTonWallet.address, targetAddress),
                        })],
                        sendMode: 3 as any,
                    }).catch(e => {
                        console.log('send transaction error', e)
                    })
                    break
                } catch (e) {
                    if (j === 4) {
                        throw e
                    }
                }
            }
        }
    }
}
main().catch((e) => {console.error(e)})
