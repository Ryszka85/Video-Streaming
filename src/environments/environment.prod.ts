export const environment = {
  endpointPrefix: '77.116.152.165:8080/',
  wsEndpoint: 'wss://77.116.152.165:8080/socket',  
  RTCPeerConfiguration: {
    iceServers: [
      {
        urls: 'stun:stun1.l.google.com:19302'
      }
    ]
  },
  production: true
};
