
type Config = {
  port: number,
  chainId: number,
  nodeIpInfo: {
    externalIp:"" ,
    externalPort: number 
  },
  dynamicConsensorNode: boolean,
  useConfigNodeIp : boolean,
  askLocalHostForArchiver: boolean,
  rotationInterval: number,
  archiverIpInfo: {
    externalIp: string,
    externalPort:number 
  },
  queryFromArchiver: boolean,
  explorerRPCDataServerInfo: {
    externalIp: string,
    externalPort:number 
  },
  recordTxStatus: boolean,
  rateLimit: boolean,
  allowReqPerMinute: number,
  statLog: boolean,
  statLogStdoutInterval:number,
  passphrase: string,
  secret_key: string,
  verbose : boolean
}

const CONFIG: Config = {
  port: 8080,
  chainId: 8080,
  nodeIpInfo: {
    externalIp:"" ,
    externalPort: 9001
  },
  dynamicConsensorNode: true,
  useConfigNodeIp : false,
  askLocalHostForArchiver: true,
  rotationInterval: 60,
  archiverIpInfo: {
    externalIp: "localhost",
    externalPort: 4000
  },
  queryFromArchiver: true,
  explorerRPCDataServerInfo: {
    externalIp: "localhost",
    externalPort: 4445
  },
  recordTxStatus: true,
  rateLimit: false,
  allowReqPerMinute: 5,
  statLog: true,
  statLogStdoutInterval: 30,
  passphrase: process.env.PASSPHRASE || 'sha4d3um', // this is to protect debug routes 
  secret_key: process.env.SECRET_KEY || 'YsDGSMYHkSBMGD6B4EmD?mFTWG2Wka-Z9b!Jc/CLkrM8eLsBe5abBaTSGeq?6g?P',  // this is the private key that rpc server will used to sign jwt token 
  verbose : false
}

module.exports = CONFIG
