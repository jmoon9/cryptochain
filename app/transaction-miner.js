const Transaction = require('../wallet/transaction');
var admin = require('firebase-admin');


class TransactionMiner{

    constructor({ blockchain, transactionPool, wallet, pubsub }){
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

    connectToDB(){ 
        // admin.initializeApp({
        //     credential: admin.credential.cert(serviceAccount)
        // });
        let db = admin.firestore();
        return db;
    }

    updateDbChain(){
        var db = this.connectToDB();
        // let data = {
        //     chain: this.blockchain.chain,
        // };

        this.blockchain.chain.forEach(elem =>{
            db.collection('Blockchain').doc(elem.hash).get().then((docSnapshot)=>{
                if(!docSnapshot.exists){
                    let updateDoc = db.collection('Blockchain').doc(elem.hash).set(Object.assign({}, {
                        timestamp: elem.timestamp,
                        lastHash: elem.lastHash,
                        hash: elem.hash,
                        nonce: elem.nonce,
                        difficulty: elem.difficulty
                    }));
                    elem.data.forEach(transaction =>{
                        let updateDoc2 = db.collection('Blockchain').doc(elem.hash).collection('transaction-data').doc(transaction.id).set(Object.assign({}, {
                            outputMap: transaction.outputMap,
                            input:{
                                timestamp: transaction.input.timestamp,
                                address: transaction.input.address,
                                sender_balance: transaction.input.amount
                            }
                        }));
                    }); 
                    
                }
            })
        })
    }

    mineTransactions(){
        const validTransactions = this.transactionPool.validTransactions();

        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet: this.wallet })
        );
        
        this.blockchain.addBlock({ data: validTransactions });

        this.pubsub.broadcastChain();

        this.updateDbChain();

        this.transactionPool.clear();
    }
}

module.exports = TransactionMiner;