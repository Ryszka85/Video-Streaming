export const environment = {
  endpointPrefix: 'https://ryszka.herokuapp.com/',
  wsEndpoint: 'wss://ryszka.herokuapp.com/socket',  
  RTCPeerConfiguration: {
    iceServers: [
      {
        urls: 'stun:stun1.l.google.com:19302'
      }
    ]
  },
  production: true
};
