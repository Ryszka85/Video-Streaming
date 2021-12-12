import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { DataService, Message } from '../data.service';
import { Peer } from '../peer-model';



export const ENV_RTCPeerConfiguration = environment.RTCPeerConfiguration;

export interface PeerContext {
  peerConnection: RTCPeerConnection;
  peerId: string;
}

export interface State {
  mediaStream: MediaStream
  peers: Map<string, RTCPeerConnection>;
  currentUserId: string;
  isNewUser: boolean;
}


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
  selector: 'app-another-room',
  templateUrl: './another-room.component.html',
  styleUrls: ['./another-room.component.scss']
})
export class AnotherRoomComponent implements OnInit {    
  @ViewChild('local_video') localVideo: ElementRef;
  @ViewChild('received_video') remoteVideo: ElementRef;
  @ViewChild('received_video2') remoteVideo2: ElementRef;
  @ViewChild('peersContainer') peersContainer: ElementRef;

  public rtcState: State = {
    mediaStream: undefined,
    peers: new Map<string, RTCPeerConnection>(),
    currentUserId: '',
    isNewUser: true
  }


  public state = {
    localMediaStream: undefined,
    peers: {}, // {[userId]: { userName: '', userId: '' }}
    currentUser:  {
      userName: '',
      userId: ''
    },
    isNewUser: true,
  }


  
  private localStream: MediaStream;
  private peerConnection: RTCPeerConnection;
  inCall = false;
  localVideoActive = false;
  private peerConnections: Array<RTCPeerConnection> = new Array<RTCPeerConnection>();
  elList: any[] = [];
  private connectionsList: Array<Connections> = new Array<Connections>();  

  ngOnInit(): void {
  }
  
  
  constructor(private dataService: DataService, private renderer: Renderer2) { }
   
  
  async call2(): Promise<void> {
    for (let [peerId, peerConnection] of this.rtcState.peers) {
          try {
            this.rtcState.mediaStream.getTracks()
                .forEach(track => 
                    peerConnection.addTransceiver(track, { streams: [ this.rtcState.mediaStream ] } )
                );
            // this.peerConnection = peerConnection; 
            const offer: RTCSessionDescriptionInit = await peerConnection.createOffer(offerOptions);
            await peerConnection.setLocalDescription(offer);      
            console.log('Sending offer .....!!!!!')
            console.log('To : ' + peerId);
            this.sendSignalingMessage({recipientId: peerId, type: 'offer', data: offer});
          } catch (err) {
            this.handleGetUserMediaError(err);
          }
    }    
  }




  async call(): Promise<void> {
    console.log('Sers Tracks')
    this.createPeerConnection();

    // if (this.peerConnection.signalingState !== 'stable') {
    //   return;
    // }

    // let peerConnection = this.initAndGetPeer();
    // this.createPeerConnection();

    // Add the tracks from the local stream to the RTCPeerConnection

    this.localStream.getTracks()
        .forEach(track => 
          this.peerConnection.addTransceiver(track, { streams: [ this.localStream ] } )
          // peerConnection.addTrack(track)
        );

    try {
      const offer: RTCSessionDescriptionInit = await this.peerConnection.createOffer(offerOptions);
      // Establish the offer as the local peer's current description.
    
      await this.peerConnection.setLocalDescription(offer);

      this.inCall = true;
      console.log('Sending offer .....!!!!!')
      this.sendSignalingMessage({type: 'offer', data: offer, });
      // this.dataService.sendMessage({type: 'offer', data: offer, });
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

  private initPeersList(userList: Array<string>): void {
    console.log(this.rtcState.peers);
    userList.forEach(id => {
      if (id !== this.rtcState.currentUserId && !this.rtcState.peers.get(id)) {
        this.rtcState.peers.set(id, this.initAndGetPeer());
      }
    })

    console.log(this.rtcState.peers);

    if (this.rtcState.isNewUser) {
      console.log(this.rtcState);
      this.rtcState.isNewUser = false
      console.log('Was a new user...');
      console.log(this.rtcState);
    }
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
            console.log(msg);
            if(this.rtcState.isNewUser) {              
              this.rtcState.currentUserId = msg.userId              
            }
            console.log(this.rtcState);
            this.state.currentUser.userId = msg.userId
            this.initPeersList(msg.sessionsList);
            console.log(this.rtcState);
            break;
            case 'Disconnected':
              console.log(msg);                            
              console.log(this.rtcState.peers);
              console.log(this.rtcState.peers.get(msg.userId))
              this.handleHangupMessage2(this.rtcState.peers.get(msg.userId), msg);
              this.rtcState.peers.delete(msg.userId);
              
              console.log(this.rtcState.peers);
              break;
          case 'offer':
            console.log('SenderId in handleOffer : ' + msg.senderId);
            // this.handleOfferMessage(msg.data);
            this.handleOfferMessage2(msg.senderId, msg.data);
            // this.offer(msg.data);
            break;
          case 'answer':
            console.log('SenderId in handleAnswerMessage : ' + msg.senderId);
            // this.handleAnswerMessage(msg.data);
            this.handleAnswerMessage2(msg.senderId, msg.data);
            // this.answer(msg.data);
            break;
          case 'hangup':
            this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            console.log('SenderId in handleICECandidateMessage : ' + msg.senderId);
            // this.handleICECandidateMessage(msg.data);
            this.handleICECandidateMessage2(msg.senderId, msg.data);
            // this.ice(msg.data)
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      error => console.log(error)
    );
  }


  insertVideo(stream: MediaStream): void {
    let video = this.renderer.createElement('video');
    console.log(video);
    video.srcObject = stream;
    video.setAttribute('autoplay', true);
    // video.setAttribute('muted', true);
    video.muted = true;
    this.renderer.appendChild(this.peersContainer.nativeElement, video);
  }

  private handleOfferMessage2(peerId: string, msg: RTCSessionDescriptionInit): void {
    let peer = this.rtcState.peers.get(peerId);
    let peerConnection = peer || this.initAndGetPeer();
    console.log('Handling offer message from peerId : ' + peerId);
    console.log(peerConnection);
    peerConnection.setRemoteDescription(new RTCSessionDescription(msg))
      .then(() => {
        this.rtcState.mediaStream.getTracks()
          .forEach(track => 
            peerConnection.addTransceiver(track, { streams: [ this.rtcState.mediaStream ] } )
          );
      }).then(() => {
        return peerConnection.createAnswer();
      }).then((answer) => {
        return peerConnection.setLocalDescription(answer);
      }).then(() => {
        this.sendSignalingMessage({type: 'answer', data: peerConnection.localDescription});
      }).catch(this.handleGetUserMediaError);
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
        // this.localStream.getTracks().forEach(
        //   track => this.peerConnection.addTrack(track, this.localStream)
        // );

        this.localStream.getTracks()
        .forEach(track => 
          this.peerConnection.addTransceiver(track, { streams: [ this.localStream ] } )
          // peerConnection.addTrack(track)
        );

        

      }).then(() => {

      // Build SDP for answer message
      return this.peerConnection.createAnswer();

    }).then((answer) => {

      // Set local SDP
      return this.peerConnection.setLocalDescription(answer);

    }).then(() => {

      // Send local SDP to remote party
      // this.dataService.sendMessage({type: 'answer', data: this.peerConnection.localDescription});
      this.sendSignalingMessage({type: 'answer', data: this.peerConnection.localDescription});

      this.inCall = true;

    }).catch(this.handleGetUserMediaError);
  }


  private handleAnswerMessage2(peerId: string, msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming answer');
    let peerConnection = this.rtcState.peers.get(peerId)
    console.log(peerConnection);
    peerConnection.setRemoteDescription(msg);
  }

  private handleAnswerMessage(msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming answer');
    this.peerConnection.setRemoteDescription(msg);
  }

  private handleHangupMessage2(peerConnection: RTCPeerConnection,msg: Message): void {
    console.log(msg);
    this.closeVideoCall2(peerConnection);
  }

  private handleHangupMessage(msg: Message): void {
    console.log(msg);
    this.closeVideoCall();
  }


  private handleICECandidateMessage2(peerId: string, msg: RTCIceCandidate): void {
    console.log(msg);    
    this.rtcState.peers
        .get(peerId)
        .addIceCandidate(new RTCIceCandidate(msg))
        .catch(this.reportError);
  }

  private handleICECandidateMessage(msg: RTCIceCandidate): void {
    console.log(msg);
    const candidate = new RTCIceCandidate(msg);
    console.log(this.peerConnection);
    this.peerConnection.addIceCandidate(candidate).catch(this.reportError);
  }

  private async requestMediaDevices(): Promise<void> {
    console.log('Bumsti is in the fucking house!! Yo Yo!! Nigger');
    try {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(
          stream => { 
            this.localStream = stream ;
            this.state.localMediaStream = stream;
            this.rtcState.mediaStream = stream;
            console.log(this.rtcState);
            this.localVideo.nativeElement.srcObject = this.rtcState.mediaStream;
            // this.insertVideo(this.rtcState.mediaStream)
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
      this.sendSignalingMessage({
        type: 'ice-candidate',
        data: event.candidate,
        // foo:'123'
      });
      // this.dataService.sendMessage({
      //   type: 'ice-candidate',
      //   data: event.candidate,
      //   // foo:'123'
      // });
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

  private handleSignalingStateChangeEvent2 = (event: Event) => {
    console.log(event);        
    switch (this.peerConnection.signalingState) {
      case 'closed':
        this.closeVideoCall();
        break;
    }
  }

  private handleSignalingStateChangeEvent = (event: Event) => {
    console.log(event);
    // switch (this.peerConnection.signalingState) {
    //   case 'closed':
    //     this.closeVideoCall();
    //     break;
    // }
  }


  private handleTrackEvent2 = (event: RTCTrackEvent) => {
    console.log(event);
    console.log('Yugo event....' + event.streams.length)

    event.streams.forEach(event => console.log(event))    
    if(this.rtcState.peers.size == 1) {
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    } else {
      this.remoteVideo2.nativeElement.srcObject = event.streams[0];
    }
    
  }

  private handleTrackEvent = (event: RTCTrackEvent) => {
    console.log(event);
    console.log('Yugo event....' + event.streams.length)

    event.streams.forEach(event => console.log(event))    
    this.remoteVideo.nativeElement.srcObject = event.streams[0];
  }

  private sendSignalingMessage(msg: any): void {
    const body = {
      senderId: this.rtcState.currentUserId,
      ...msg
    }
    console.log( body );
    this.dataService.sendMessage(body);
  }


  private initAndGetPeer(): RTCPeerConnection {
    let peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration);    
    peerConnection.onicecandidate = this.handleICECandidateEvent;
    peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    peerConnection.ontrack = this.handleTrackEvent2;  
      
    return peerConnection;
  }

  public withPeerContext<T>(callback, peerContext) {
    return (event: T) => callback(event, peerContext)
  }

  private createPeerConnection(): void {
    console.log('creating PeerConnection...');
    this.peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration);

    this.peerConnection.onicecandidate = this.handleICECandidateEvent;
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.peerConnection.ontrack = this.handleTrackEvent;    
  }

  private closeVideoCall2(peerConnection: RTCPeerConnection): void {
    console.log('Closing call');
    console.log(this.rtcState.peers);
    if (peerConnection) {
      console.log('--> Closing the peer connection');
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.oniceconnectionstatechange = null;
      peerConnection.onsignalingstatechange = null;
      peerConnection.getTransceivers().forEach(transceiver => {
        transceiver.stop();
      });
      peerConnection.close();
      peerConnection = null;      
    }
  }

  private closeVideoCall(): void {
    console.log('Closing call');
    console.log(this.rtcState.peers);

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
  

}
