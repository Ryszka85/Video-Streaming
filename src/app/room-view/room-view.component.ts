import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { DataService, Message } from '../data.service';

export const ENV_RTCPeerConfiguration = environment.RTCPeerConfiguration;


export interface Connections {
  clientId: string;
  peer: RTCPeerConnection;
}

const constraints = {
  audio: true,
  video: { width: 400, height: 400 }
}

const offerOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

@Component({
  selector: 'app-room-view',
  templateUrl: './room-view.component.html',
  styleUrls: ['./room-view.component.scss']
})
export class RoomViewComponent implements AfterViewInit{
  @ViewChild('local_video') localVideo: ElementRef;
  @ViewChild('received_video') remoteVideo: ElementRef;
  @ViewChild('v1') v1: ElementRef;
  @ViewChild('v2') v2: ElementRef;
  @ViewChild('container') container: ElementRef;
  private localStream: MediaStream;
  private peerConnection: RTCPeerConnection;
  inCall = false;
  localVideoActive = false;
  private peerConnections: Array<RTCPeerConnection> = new Array<RTCPeerConnection>();
  elList: any[] = [];
  private connectionsList: Array<Connections> = new Array<Connections>();


  
  
  // async ngAfterViewInit(): Promise<void> {
  //   this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
  //   this.localVideo.nativeElement.srcObject = this.localStream;
  // }
  
  
  constructor(private dataService: DataService, private renderer: Renderer2) { }


  async newTestCall(): Promise<void> { 
    this.connectionsList.forEach(async connection => {
      console.log('Processing connection : ' + connection.clientId);
      
      this.localStream.getTracks().forEach(
        track => {
          console.log(connection.peer.getSenders());                   
          connection.peer.addTrack(track, this.localStream);                                      
        }        
      );
      try {
        
        const offer: RTCSessionDescriptionInit = await connection.peer.createOffer(offerOptions);
        // Establish the offer as the local peer's current description.
        await connection.peer.setLocalDescription(offer);
        console.log(offer);      
        this.inCall = true;
  
        this.dataService.sendMessage({type: 'offer', data: offer, address: connection.clientId});
      } catch (err) {
        this.handleGetUserMediaError(err);
      }
    })
  } 
   
  async testCall(): Promise<void> {
    
    console.log('Peer connections size : ' + this.peerConnections.length);
    console.log('Localstream tracks length ..: ' + this.localStream.getTracks().length)
    this.peerConnections.forEach(async peer => {     

      this.localStream.getTracks().forEach(
        track => {
          console.log(peer.getSenders());                   
          peer.addTrack(track, this.localStream);        

          console.log(peer);
          console.log(peer.getSenders());          
          
        }
      );
      
     
      
  
      try {
        
        const offer: RTCSessionDescriptionInit = await peer.createOffer(offerOptions);
        // Establish the offer as the local peer's current description.
        await peer.setLocalDescription(offer);
        console.log(offer);
        console.log('Before sending offer message ...');
  
        this.inCall = true;
  
        this.dataService.sendMessage({type: 'offer', data: offer});
      } catch (err) {
        this.handleGetUserMediaError(err);
      }    
    })    

    

  }

  async call(): Promise<void> {
    console.log('Sers Tracks')
    this.createPeerConnection();

    // Add the tracks from the local stream to the RTCPeerConnection
    this.localStream.getTracks().forEach(
      track => {
        console.log(track);
        this.peerConnection.addTrack(track, this.localStream);
      }
    );

    try {
      const offer: RTCSessionDescriptionInit = await this.peerConnection.createOffer(offerOptions);
      // Establish the offer as the local peer's current description.
    
      await this.peerConnection.setLocalDescription(offer);

      this.inCall = true;

      this.dataService.sendMessage({type: 'offer', data: offer});
    } catch (err) {
      this.handleGetUserMediaError(err);
    }
  }

  hangUp(): void {
    this.dataService.sendMessage({type: 'hangup', data: ''});
    this.closeVideoCall();
  }

  ngAfterViewInit(): void {
    this.addIncominMessageHandler();
    this.requestMediaDevices();
  }

  private addIncominMessageHandler(): void {
    this.dataService.connect();
    console.log('Aga');
    // this.transactions$.subscribe();
    this.dataService.messages$.subscribe(
      msg => { 
        console.log('Received message: ' + msg.type);
        switch (msg.type) {
          case 'Connected':
            let peer = this.createPeer();
            this.connectionsList.push( { clientId: msg.data, peer: peer } )
            this.connectionsList.forEach(con => console.log(con))
            this.peerConnections.push(peer);
            console.log(msg.data);
            break;
          case 'offer':
            this.handleOfferMessage(msg.data);
            // this.offer(msg.data);
            break;
          case 'answer':
            this.handleAnswerMessage(msg.data);
            // this.answer(msg.data);
            break;
          case 'hangup':
            this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            this.handleICECandidateMessage(msg.data);
            // this.ice(msg.data)
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      error => console.log(error)
    );
  }

  private handleConnectedUser() {
    this.createPeer()
  }

  /* ########################  MESSAGE HANDLER  ################################## */

  private inconmingOffer(msg: RTCSessionDescriptionInit): void {
    this.connectionsList
        .forEach(connection => {
          connection.peer
            .setRemoteDescription(new RTCSessionDescription(msg))
            .then(() => {
              console.log('handle incoming offer');    
              console.log(connection.peer);
              this.localStream.getTracks().forEach(
                track => {
                  connection.peer.addTrack(track, this.localStream);            
                }
              );
              return connection.peer.createAnswer();
            }).then((answer) => {
              console.log(answer);    
              return connection.peer.setLocalDescription(answer);    ;    
            }).then(() => {
              console.log('Starting to send answer ..')
              console.log( connection.peer.localDescription)
              this.dataService.sendMessage({type: 'answer', data: connection.peer.localDescription, address: connection.clientId});
              this.inCall = true; 
            }).catch(this.handleGetUserMediaError); 
        })
  }

  private offer(msg: RTCSessionDescriptionInit): void {   
    console.log('size : ' + this.peerConnections.length);
    console.log('offer message : ' + msg.sdp)
    this.peerConnections.forEach(peerConnection => {
      console.log(peerConnection)
      peerConnection.setRemoteDescription(new RTCSessionDescription(msg))
      .then(() => {
        console.log('handle incoming offer');    
        console.log(peerConnection);
        this.localStream.getTracks().forEach(
          track => {
            peerConnection.addTrack(track, this.localStream);            
          }
        );
      }).then(() => {
      return peerConnection.createAnswer();
    }).then((answer) => {
      console.log(answer);    
      return peerConnection.setLocalDescription(answer);    ;    
    }).then(() => {
      console.log('Starting to send answer ..')
      console.log( peerConnection.localDescription)
      this.dataService.sendMessage({type: 'answer', data: peerConnection.localDescription});
      this.inCall = true; 
    }).catch(this.handleGetUserMediaError);    
    })
    
  }

  private checkIfAddTrack(track: MediaStreamTrack, peerConnection: RTCPeerConnection): void {
    console.log(peerConnection.getSenders());
    peerConnection.getSenders().forEach(sender => {
      console.log(sender.track.id );
      console.log(track.id);
      if (sender.track.id !== track.id) {
        console.log('Sender is not null');
        peerConnection.addTrack(track, this.localStream);
      } 
    }) 
  }



  private handleOfferMessage(msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming offer');    
    if (!this.peerConnection) {
      console.log('Creating peer....');
      this.createPeerConnection();
    }

    if (!this.localStream) {
      this.startLocalVideo();
    }

    this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg))
      .then(() => {

        // add media stream to local video
        this.localVideo.nativeElement.srcObject = this.localStream;

        // add media tracks to remote connection
        this.localStream.getTracks().forEach(
          track => this.peerConnection.addTrack(track, this.localStream)
        );

      }).then(() => {

      // Build SDP for answer message
      return this.peerConnection.createAnswer();

    }).then((answer) => {

      // Set local SDP
      return this.peerConnection.setLocalDescription(answer);

    }).then(() => {

      // Send local SDP to remote party
      this.dataService.sendMessage({type: 'answer', data: this.peerConnection.localDescription});

      this.inCall = true;

    }).catch(this.handleGetUserMediaError);
  }


  private incomingAnswer(msg: RTCSessionDescriptionInit): void { 
    this.connectionsList.forEach(connection => {
      if(connection.peer && msg) {
        connection.peer.setRemoteDescription(msg)
      }
    })
  }

  private answer(msg: RTCSessionDescriptionInit): void {
    console.log(this.peerConnections.length);
    this.peerConnections.forEach(peerConnection => {
      if(peerConnection && msg) {
        peerConnection.setRemoteDescription(msg)
      }
    });
  }

  private handleAnswerMessage(msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming answer');
    this.peerConnection.setRemoteDescription(msg);
  }

  private handleHangupMessage(msg: Message): void {
    console.log(msg);
    this.closeVideoCall();
  }

  private incomingIce(msg: RTCIceCandidate): void {   
    this.connectionsList.forEach(conneciton => {
      const candidate = new RTCIceCandidate(msg);
      if(candidate && conneciton.peer) {
        conneciton.peer.addIceCandidate(candidate);
      }
    })
  }

  private ice(msg: RTCIceCandidate): void {    
    this.peerConnections.forEach(peerConnection => {  
      console.log('running ice ..' + msg)    
      const candidate = new RTCIceCandidate(msg);
      console.log('running ice ..' + candidate)    
      if(candidate && peerConnection) {
        peerConnection.addIceCandidate(candidate).catch(this.reportError); 
      }
      
    });
  }

  private handleICECandidateMessage(msg: RTCIceCandidate): void {
    const candidate = new RTCIceCandidate(msg);
    this.peerConnection.addIceCandidate(candidate).catch(this.reportError);
  }

  private async requestMediaDevices(): Promise<void> {
    console.log('Bumsti is in the fucking house!! Yo Yo!! Nigger');
    try {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(
          stream => { 
            this.localStream = stream ;
            this.localVideo.nativeElement.srcObject = this.localStream;
          }
        );
      
      // pause all tracks
      // this.pauseLocalVideo();
    } catch (e) {
      console.error(e);
      alert(`getUserMedia() error: ${e.name}`);
    }
  }

  startLocalVideo(): void {
    console.log('starting local stream');
    // this.localStream.getTracks().forEach(track => {
    //   track.enabled = true;
    // });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.localVideoActive = true;
  }

  pauseLocalVideo(): void {
    console.log('pause local stream');
    this.localStream.getTracks().forEach(track => {
      track.enabled = false;
    });
    this.localVideo.nativeElement.srcObject = undefined;

    this.localVideoActive = false;
  }

  private createPeerConnection(): void {
    console.log('creating PeerConnection...');
    this.peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration);

    this.peerConnection.onicecandidate = this.handleICECandidateEvent;
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.peerConnection.ontrack = this.handleTrackEvent;    
    // this.peerConnection.ontrack = this.handleTrack;  
  }

  private createPeer(): RTCPeerConnection {
    console.log('Creating peer connection...');
    let peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration);
    peerConnection.onicecandidate = this.handleICECandidateEvent;
    peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    peerConnection.ontrack = this.handleTrack;
    
    return peerConnection;
  }

  private closeVideoCall(): void {
    console.log('Closing call');

    if (this.peerConnection) {
      console.log('--> Closing the peer connection');

      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;

      // Stop all transceivers on the connection
      this.peerConnection.getTransceivers().forEach(transceiver => {
        transceiver.stop();
      });

      // Close the peer connection
      this.peerConnection.close();
      this.peerConnection = null;

      this.inCall = false;
    }
  }

  /* ########################  ERROR HANDLER  ################################## */
  private handleGetUserMediaError(e: Error): void {
    switch (e.name) {
      case 'NotFoundError':
        alert('Unable to open your call because no camera and/or microphone were found.');
        break;
      case 'SecurityError':
      case 'PermissionDeniedError':
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        console.log(e);
        alert('Error opening your camera and/or microphone: ' + e.message);
        break;
    }

    this.closeVideoCall();
  }

  private reportError = (e: Error) => {
    console.log('got Error: ' + e.name);
    console.log(e);
  }

  /* ########################  EVENT HANDLER  ################################## */
  private handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    console.log(event);
    if (event.candidate) {
      this.dataService.sendMessage({
        type: 'ice-candidate',
        data: event.candidate
      });
    }
  }

  private handleICEConnectionStateChangeEvent = (event: Event) => {
    console.log(event);
    // switch (this.peerConnection.iceConnectionState) {
    //   case 'closed':
    //   case 'failed':
    //   case 'disconnected':
    //     this.closeVideoCall();
    //     break;
    // }
  }

  private handleSignalingStateChangeEvent = (event: Event) => {
    console.log(event);
    // switch (this.peerConnection.signalingState) {
    //   case 'closed':
    //     this.closeVideoCall();
    //     break;
    // }
  }


  private newTrackHandler = (event: RTCTrackEvent) => { 
    if(this.connectionsList.length === 1) {
      this.v1.nativeElement.srcObject = event.streams[0];
    } else {
      this.v2.nativeElement.srcObject = event.streams[0];
    }
  }

  private handleTrack = (event: RTCTrackEvent) => {
    
    // let el = this.renderer.createElement('video');
    // console.log(el);
    // el.srcObj = event.streams[0];
    // el.autoPlay = true;
    // this.elList.push(el);    
    // this.renderer.appendChild(this.container.nativeElement, el);
 

    if(this.peerConnections.length === 1) {
      console.log('setting v1')
      this.v1.nativeElement.srcObject = event.streams[0];
    } else {
      console.log('setting v2')
      this.v2.nativeElement.srcObject = event.streams[0];
    }
  }

  private handleTrackEvent = (event: RTCTrackEvent) => {
    console.log(event);
    console.log('Yugo event....' + event.streams.length)

    event.streams.forEach(event => console.log(event))
    this.remoteVideo.nativeElement.srcObject = event.streams[0];
  }

  
}
