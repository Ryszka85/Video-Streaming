export const environment = {
  endpointPrefix: 'http://77.116.152.165:8080/',
  wsEndpoint: 'wss://localhost:8443/socket',  
  RTCPeerConfiguration: {
    iceServers: [
      {
        urls: 'stun:stun1.l.google.com:19302'
      }
    ]
  },
  production: true
};
