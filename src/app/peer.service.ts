import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Peer } from './peer-model';

export interface OfferMsg {
  senderId: string,
  data: RTCSessionDescriptionInit
}

export interface ICEMsg {
  senderId: string,
  candidate: RTCIceCandidateInit
}

export interface PeerContext {
  peerConnection: RTCPeerConnection;
  peer: Peer;
}



// export interface PeerConnectionConfig {
//   peer: Peer;
//   localMediaStream: MediaStream;
//   onIceCandidate: (event, peerContext: PeerContext) => {};
//   oniceconnectionstatechange: (event, peerContext: PeerContext) => {};
// 	onsignalingstatechange: (event, peerContext: PeerContext) => {};
// 	onnegotiationneeded: (event, peerContext: PeerContext) => {};
// 	ontrack: (event, peerContext) => { };
// 	iceServers: []
// }

export const ENV_RTCPeerConfiguration = environment.RTCPeerConfiguration;

@Injectable({
  providedIn: 'root'
})
export class PeerService {

  constructor() { }

  public createPeerConnection(
      peer: Peer = undefined,
	    localMediaStream: MediaStream = undefined,
	    onicecandidate: (event, peerContext: PeerContext) => void,
	    oniceconnectionstatechange: (event, peerContext: PeerContext) => void,
	    onsignalingstatechange: (event, peerContext: PeerContext) => void,
	    onnegotiationneeded: (event, peerContext: PeerContext) => void,
	    ontrack: (event, peerContext: PeerContext) => void
    ): RTCPeerConnection {

    let peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration)

    console.log(localMediaStream);

    

    localMediaStream.getTracks()
        .forEach(track => 
          peerConnection.addTransceiver(track, { streams: [ localMediaStream ] } )
          // peerConnection.addTrack(track)
        );
    const peerContext: PeerContext = {
      peerConnection,
      peer
    };

    peerConnection.onicecandidate = this.withPeerContext(onicecandidate, peerContext);
    peerConnection.oniceconnectionstatechange = this.withPeerContext(oniceconnectionstatechange, peerContext);
	  peerConnection.onsignalingstatechange = this.withPeerContext(onsignalingstatechange, peerContext);
	  peerConnection.onnegotiationneeded = this.withPeerContext(onnegotiationneeded, peerContext);
	  peerConnection.ontrack = this.withPeerContext(ontrack, peerContext);

    return peerConnection;
  }

  public withPeerContext(callback, peerContext) {
    return (event) => callback(event, peerContext)
  }


  public closePeerConnection(peerConnection: RTCPeerConnection): void {
    if (!peerConnection) {
      return
    }
  
    // Disconnect all our event listeners; we don't want stray events
    // to interfere with the hangup while it's ongoing.
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onsignalingstatechange = null;
    peerConnection.onicegatheringstatechange = null;
    peerConnection.onnegotiationneeded = null;
  
    // Stop all transceivers on the connection
    peerConnection.getTransceivers().forEach(transceiver => {
      transceiver.stop();
    });
  
    peerConnection.close()
  }

  


}
