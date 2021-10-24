export const environment = {
  wsEndpoint: 'ws://77.116.152.165:8080/socket',  
  RTCPeerConfiguration: {
    iceServers: [
      {
        urls: 'stun:stun1.l.google.com:19302'
      }
    ]
  },
  production: true
};
