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
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements AfterViewInit {
  @ViewChild('local_video') localVideo: ElementRef;
  @ViewChild('received_video') remoteVideo: ElementRef;
  @ViewChild('received_video2') remoteVideo2: ElementRef;
  private peerMap: Map<string, RTCPeerConnection> = new Map();
  
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

  private handleICEConnectionStateChangeEvent = (event: Event) => {
    console.log(event);
    switch (this.peerConnection.iceConnectionState) {
      case 'closed':
      case 'failed':
      case 'disconnected':
        this.closeVideoCall();
        break;
    }
  }

  private handleSignalingStateChangeEvent = (event: Event) => {
    console.log(event);
    switch (this.peerConnection.signalingState) {
      case 'closed':
        this.closeVideoCall();
        break;
    }
  }
   
  async sendOffer(sessionId: string): Promise<void> {
    let peerConnection = this.createPeer();            
    this.localStream
        .getTracks()
        .forEach(track => {
          peerConnection.addTransceiver(track, { streams: [ this.localStream ] } )
        })
        try {
          const offer: RTCSessionDescriptionInit = await peerConnection.createOffer(offerOptions);
          // Establish the offer as the local peer's current description.
        
          await peerConnection.setLocalDescription(offer);
    
          this.inCall = true;
          this.peerMap.set(sessionId, peerConnection);
    
          this.dataService.sendMessage({type: 'offer', data: offer, address: sessionId});
        } catch (err) {
          this.handleGetUserMediaError(err);
        }

  }

  async call(): Promise<void> {
    console.log('Sers Tracks')
    this.createPeerConnection();

    // Add the tracks from the local stream to the RTCPeerConnection
    this.localStream.getTracks().forEach(
      track => {
        console.log(track);
        
        this.peerConnection.addTransceiver(track, { streams: [ this.localStream ] } )
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
            console.log(`connected id : ${msg.data}`);       
            if(!this.localStream) {
              this.requestMediaDevices(msg.data)              
            } else {
              this.sendOffer(msg.data);
            }    
             
            console.log(this.peerMap);
            break;
          case 'Disconnected':
            console.log(`disconnected id : ${msg.data}`);
            this.peerMap.delete(msg.data);
            console.log(this.peerMap);
            break;
          case 'offer':
            // this.handleOfferMessage(msg.data);
            this.handleOfferMsg(msg.data, msg.address);
            // this.offer(msg.data);
            break;
          case 'answer':
            this.handleAnswerMsg(msg.data);
            // this.handleAnswerMessage(msg.data);
            // this.answer(msg.data);
            break;
          case 'hangup':
            // this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            // this.handleICECandidateMessage(msg.data);
            this.handleICECandidateMsg(msg.data);
            // this.ice(msg.data)
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      error => console.log(error)
    );
  }



  /* ########################  MESSAGE HANDLER  ################################## */

 

  private handleOfferMsg(msg: RTCSessionDescriptionInit, sessionId: string): void {
    // let peerConnection = this.createPeer();
    for(let [key, peerConnection] of this.peerMap) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(msg))
      .then(() => {

        // add media stream to local video
        // this.localVideo.nativeElement.srcObject = this.localStream;

        // add media tracks to remote connection
        this.localStream.getTracks().forEach(
          track => peerConnection.addTransceiver(track, { streams: [ this.localStream ] } )
        );

      }).then(() => {

      // Build SDP for answer message
      return peerConnection.createAnswer();

    }).then((answer) => {

      // Set local SDP
      return peerConnection.setLocalDescription(answer);

    }).then(() => {

      // Send local SDP to remote party
      this.dataService.sendMessage({type: 'answer', data: peerConnection.localDescription, address: sessionId});
      this.peerMap.set(sessionId, peerConnection);

      this.inCall = true;

    }).catch(this.handleGetUserMediaError);
    }  
    
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
          track => this.peerConnection.addTransceiver(track, { streams: [ this.localStream ] } )
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


  private handleAnswerMessage(msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming answer');
    this.peerConnection.setRemoteDescription(msg);
  }

  private handleAnswerMsg(msg: RTCSessionDescriptionInit): void {
    for(let [key, peerConnection] of this.peerMap) {
      peerConnection.setRemoteDescription(msg);
    }    
  }

  private handleHangupMessage(msg: Message): void {
    console.log(msg);
    this.closeVideoCall();
  }

  private handleICECandidateMsg(msg: RTCIceCandidate): void {
    const candidate = new RTCIceCandidate(msg);
    for(let [key, peerConnection] of this.peerMap) {
      peerConnection.addIceCandidate(candidate).catch(this.reportError);  
    }    
  }


  private handleICECandidateMessage(msg: RTCIceCandidate): void {
    const candidate = new RTCIceCandidate(msg);
    this.peerConnection.addIceCandidate(candidate).catch(this.reportError);
  }

  private async requestMediaDevices(sessionId: string = null): Promise<void> {
    console.log('Bumsti is in the fucking house!! Yo Yo!! Nigger');
    try {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(
          stream => { 
            this.localStream = stream ;
            this.localVideo.nativeElement.srcObject = this.localStream;
            if(sessionId !== null) {
              this.sendOffer(sessionId);
            }
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

  


  // private newTrackHandler = (event: RTCTrackEvent) => { 
  //   if(this.connectionsList.length === 1) {
  //     this.v1.nativeElement.srcObject = event.streams[0];
  //   } else {
  //     this.v2.nativeElement.srcObject = event.streams[0];
  //   }
  // }

  private handleTrack = (event: RTCTrackEvent) => {
    console.log(this.peerMap.keys.length)
    console.log(event.track.id)
    console.log(this.peerMap.size);
    // for(let [key, peerConnection] of this.peerMap) {
      
    //   console.log(key)
    //   console.log()
    // }  
    if(this.peerMap.size === 1) {
      console.log('1 key')
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    } else {
      console.log('2 key')
      this.remoteVideo2.nativeElement.srcObject = event.streams[0];
    }
  }

  private handleTrackEvent = (event: RTCTrackEvent) => {
    console.log(event);
    console.log('Yugo event....' + event.streams.length)

    event.streams.forEach(event => console.log(event))
    this.remoteVideo.nativeElement.srcObject = event.streams[0];
  }

}
