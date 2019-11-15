const PubNub = require('pubnub');

const credentials = {
    publishKey: 'pub-c-3e27bdc3-19ee-432d-8798-4de5e572d263',
    subscribeKey: 'sub-c-9803ad36-f1e9-11e9-ad72-8e6732c0d56b', 
    secretKey: 'sec-c-M2FhMDc4ZjgtYzI2Ni00MjZlLWIzZGItY2I3NzAxNzAwMjRj'
};

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub{
    constructor({ blockchain, transactionPool, wallet }){
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;

        this.pubnub = new PubNub(credentials);
        this.pubnub.subscribe({ channels: [Object.values(CHANNELS)] });

        this.pubnub.addListener(this.listener());
    }

    listener() {
        return {
            message: messageObject => {
                const{ channel, message } = messageObject;

                console.log(`Message received. Channel: ${channel}. Message: ${message}`);

                const parsedMessage = JSON.parse(message);
                
                switch(channel){
                    case CHANNELS.BLOCKCHAIN:
                        this.blockchain.replaceChain(parsedMessage, true, ()=> {
                            this.transactionPool.clearBlockchainTransactions({
                                chain: parsedMessage
                            });
                        });
                        break;
                    case CHANNELS.TRANSACTION:
                        if(!this.transactionPool.existingTransaction({
                            inputAddress: this.wallet.publicKey}))
                        {
                            this.transactionPool.setTransaction(parsedMessage);
                        }
                        break;
                    default:
                        return;
                }
            }
        }
    }

    publish({ channel, message }){
        this.pubnub.publish( {channel, message})
            .catch(e => {console.log(e);});
    }
    
    broadcastChain(){
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        })
    }

    broadcastTransaction(transaction){
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        })
    }
}


module.exports = PubSub;