const { toBuffer } = require("ethereumjs-util");
const { Transaction, AccessListEIP2930Transaction } = require("@ethereumjs/tx");
const axios = require("axios");
const config = require("./config.json")
export let node = {
    ip: 'localhost',
    port: 9001
}

let verbose = config.verbose
let gotArchiver = false
let nodeList: any[] = []
let nextIndex = 0
let perfTracker: any = {}

export async function updateNodeList() {
    if (config.askLocalHostForArchiver === true) {
        if (gotArchiver === false) {
            gotArchiver = true
            //TODO query a localhost (or other) node or a valid archiver IP
        }
    }

    const res = await axios.get(`http://${config.archiverIpInfo.externalIp}:${config.archiverIpInfo.externalPort}/nodelist`)
    const nodes = res.data.nodeList
    if (nodes.length > 0) {
        nodeList = [...nodes]
        if (verbose) console.log('Nodelist is updated')
    }
}

export async function waitRandomSecond() {
    let second = Math.floor(Math.random() * 5) + 1
    if (verbose) console.log(`Waiting ${second} second`)
    await sleep(second * 1000)
}

export async function requestWithRetry(method: string, url: string, data: any = {}) {
    let retry = 0 
    let maxRetry = 5 //set this to 0 with for load testing rpc server
    let success = false
    while (!success && retry <= maxRetry) {
        retry++
        try {
            // if (true) console.log(`Running request with retry: ${url} count: ${retry}`)
            const res = await axios({
                method,
                url,
                data
            });
            if (res.status === 200 && !res.data.error) {
                success = true
                return res
            }
        } catch (e: any) {
            console.log('Error: requestWithRetry', e.message)
        }
        
        if(retry <= maxRetry){
            if (verbose) console.log('Node is busy...will try again in a few seconds')
            await waitRandomSecond()            
        } else {
            if (verbose) console.log('Node is busy...out of retries')
        }
    }
    return { data: null }
}

export function getTransactionObj(tx: any): any {
    if (!tx.raw) throw Error('No raw tx found.')
    let transactionObj
    const serializedInput = toBuffer(tx.raw)
    try {
        transactionObj = Transaction.fromRlpSerializedTx(serializedInput)
        if (verbose) console.log('Legacy tx parsed:', transactionObj)
    } catch (e) {
        if (verbose) console.log('Unable to get legacy transaction obj', e)
    }
    if (!transactionObj) {
        try {
            transactionObj = AccessListEIP2930Transaction.fromRlpSerializedTx(serializedInput)
            if (verbose) console.log('EIP2930 tx parsed:', transactionObj)
        } catch (e) {
            console.log('Unable to get EIP2930 transaction obj', e)
        }
    }

    if (transactionObj) {
        return transactionObj
    } else throw Error('tx obj fail')
}

export function intStringToHex(str: string) {
    return '0x' + parseInt(str, 10).toString(16)
}
export function getBaseUrl() {
    setConsensorNode()
    return `http://${node.ip}:${node.port}`
}

export function changeNode(ip: string, port: number) {
    node.ip = ip
    node.port = port
    if (verbose) console.log(`RPC server subscribes to ${ip}:${port}`)
}

function rotateConsensorNode() {
    let consensor: any = getNextConsensorNode()//getRandomConsensorNode()
    if (consensor) {
        let nodeIp = consensor.ip
        //Sometimes the external IPs returned will be local IPs.  This happens with pm2 hosting multpile nodes on one server.
        //config.useConfigNodeIp will override the local IPs with the config node external IP when rotating nodes
        if (config.useConfigNodeIp === true) {
            nodeIp = config.nodeIpInfo.externalIp
        }
        changeNode(nodeIp, consensor.port)
    }
}

export function apiStatCollector(methodName: any, args: string[]) {
    let now = Math.round(Date.now() / 1000)
    if (perfTracker[methodName]) {
        perfTracker[methodName].push(true)
    } else {
        perfTracker[methodName] = [true]
    }
}

// this is the main function to be called every RPC request
export function setConsensorNode() {
    if (config.dynamicConsensorNode) {
        rotateConsensorNode()
    } else {
        changeNode(config.nodeIpInfo.externalIp, config.nodeIpInfo.externalPort)
    }
}

export function getRandomConsensorNode() {
    if (nodeList.length > 0) {
        let randomIndex = Math.floor(Math.random() * nodeList.length)
        return nodeList[randomIndex]
    }
}

/**
 * Round robin selection of next consensor index.
 * @returns 
 */
export function getNextConsensorNode() {
    if (nodeList.length > 0) {
        nextIndex++
        if(nextIndex >= nodeList.length){
            nextIndex = 0
        }
        return nodeList[nextIndex]
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(true)
        }, ms)
    })
}

export async function getAccount(addressStr: any) {
    try {
        if (verbose) console.log(`${getBaseUrl()}/account/${addressStr}`)
        // let res = await axios.get(`${getBaseUrl()}/account/${addressStr}`)
        let res = await requestWithRetry('get', `${getBaseUrl()}/account/${addressStr}`)
        return res.data.account
    } catch (e) {
        console.log('getAccount error', e)
    }
}

export function apiPefLogger(intervalInSecond: number){
    // snapshot the perfTracker, 
    // because perfTracker could very well be changing while this function is running
    // so perfTracker cannnot be used for active calculation
    const snapshot = perfTracker;
    perfTracker = {}

    const converted: any = {};

    // calculate request per second
    for (const key in snapshot) {
        converted[key] = (snapshot[key].length/intervalInSecond).toFixed(2)
    }

    const sorted = Object.entries(converted)
        .sort(([,a]: any,[,b]: any) => b-a)
        .slice(0,5)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {})

    console.log(`Top 5 busiest endpoints for the last ${intervalInSecond}s :`,sorted)
}

