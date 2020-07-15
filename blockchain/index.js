const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const { cryptoHash } = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain{
    constructor(){
        this.chain = [Block.genesis()];
    }

    addBlock({data}){
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],     //find last block in current chain
            data
        });

        this.chain.push(newBlock);                          //push new block to end of chain, hashing to previous block
    }

    replaceChain(chain, validateTransactions, onSuccess){
        if(chain.length <= this.chain.length){
            console.error('The incoming chain must be longer');
            return;
        }
        
        if(!Blockchain.isValidChain(chain)){
            console.error('The incoming chain must be valid');
            return;

        }

        if(validateTransactions && !this.validTransactionData({ chain })){
            console.error('The incoming chain has invalid transaction data');
            return;
        }

        if(onSuccess) onSuccess();
        console.log('Replacing chain with ', chain);
        this.chain = chain;
    }

    validTransactionData({ chain }){
        for(let i = 1; i < chain.length; i++){
            const block = chain[i];
            const transactionSet = new Set();   //collection of unique items, check for duplicate transactions
            let rewardTransactionCount = 0;

            for(let transaction of block.data){
                if(transaction.input.address === REWARD_INPUT.address){
                    rewardTransactionCount += 1;

                    if(rewardTransactionCount > 1){         //ensure one miner reward given
                        console.error('Miner rewards exceed limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD){      //correct miner amount
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                }else{
                    if(!Transaction.validTransaction(transaction)){         
                        console.error('Invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalance({   //true balance of input wallet address after transaction
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    if(transaction.input.amount !== trueBalance){   //Inconsistency among true balance of account and balance in chain
                        console.error('Invalid input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)){        //duplicate transaction 
                        console.error('An identical transaction appears more than once in block');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }
            }
        }

        return true;
    }

    static isValidChain(chain){
        if(JSON.stringify(chain[0].hash) !== JSON.stringify(Block.genesis().hash)){
            return false;
        };

        for(let i = 1; i < chain.length; i++){
            const {timestamp, lastHash, hash, nonce, difficulty, data} = chain[i];  // destructure json during assignment
            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;


            if(lastHash !== actualLastHash) return false;

            const validatedHash = cryptoHash(timestamp, lastHash, nonce, difficulty, data);

            if(hash !== validatedHash) return false;

            if((lastDifficulty - difficulty) > 1) return false;
        }
        return true;
    }
}

module.exports = Blockchain;