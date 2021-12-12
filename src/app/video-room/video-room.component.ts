import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { DataService, messageTypes } from '../data.service';
import { ICEMsg, OfferMsg, PeerContext, PeerService } from '../peer.service';
import { UserMediaService } from '../user-media.service';
import { tap, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-video-room',
  templateUrl: './video-room.component.html',
  styleUrls: ['./video-room.component.scss']
})
export class VideoRoomComponent implements OnInit {
  @ViewChild('container') container: ElementRef;
  @ViewChild('video') video: ElementRef;
  public username: string = '';
  public state = {
    localMediaStream: undefined,
    peers: {}, // {[userId]: { userName: '', userId: '' }}
    currentUser:  {
      userName: '',
      userId: ''
    },
    isNewUser: true,
  }

  constructor(private webSocketService: DataService,
              private peerService: PeerService,
              private mediaService: UserMediaService,
              private renderer: Renderer2) { }

  async ngOnInit(): Promise<void> {       
    await this.initLocalVideo(`${this.state.currentUser.userName} (Me)`);
    await this.webSocketService.connectToWebsocket(this.messageHandles);    
    console.log(this.state);
  }

  public saveUserId = (message = { userId: '' }) => {    
    console.log(message);
    this.state.currentUser.userId = message.userId
    console.log(this.state);                
  }

  public updateUserList = (message = { users: [{ userId: '', userName: '' }] }) => {

    console.log(message);
    console.log(this.state.peers);
    message.users.forEach(u => {
      if (u.userId !== this.state.currentUser.userId && !this.state.peers[u.userId]) {
        this.state.peers[u.userId] = u
      }
    })

    console.log(this.state);
  
    if (this.state.isNewUser) {
      this.state.isNewUser = false
      this.callPeers()
    }
  }

  respondToOffer = async (message: OfferMsg) => {
    console.log('Creating Answer ....');
    let peer = this.state.peers[message.senderId];
    let peerConnection = peer.peerConnection || this.initPeerConnection(peer);

    

    
  
    console.log(message);
    let remoteSdp = new RTCSessionDescription(message.data);
  
    if (peerConnection.signalingState !== 'stable') {
      await Promise.all([
        peerConnection.setLocalDescription({type: 'rollback'}),
        peerConnection.setRemoteDescription(remoteSdp)
      ]);
      return;
    } else {
      console.log(remoteSdp);
      await peerConnection.setRemoteDescription(remoteSdp);
    }
  
    
    peerConnection.setLocalDescription(await peerConnection.createAnswer())
    
    
    console.log('And Then')
            
    this.state.localMediaStream.getTracks()
        .forEach(track => 
            peerConnection.addTransceiver(track )
            // peerConnection.addTrack(track)
        );


    this.webSocketService.sendMsg(
      {
        senderId: this.state.currentUser.userId,
        receipentId: message.senderId,
        type: messageTypes.answer,
        data: peerConnection.localDescription
      }
    )

    
    
  
    
  }

   saveSdpAnswer = async (message: OfferMsg) => {
    console.log('Saving SDP answer');
    let { peerConnection } = this.state.peers[message.senderId];
    let remoteSdp = new RTCSessionDescription(message.data);
    
    await peerConnection.setRemoteDescription(remoteSdp);
  }

  addIceCandidate = async (message: ICEMsg) => {
    // TODO: IMPLEMENT
    console.log('Adding ICE Candidate');
    let { peerConnection } = this.state.peers[message.senderId];
    let candidate = new RTCIceCandidate(message.candidate);
  
    await peerConnection.addIceCandidate(candidate)
  }

  public messageHandles = {
    [messageTypes.signalServerConnected]: this.saveUserId,
    [messageTypes.userList]: this.updateUserList,
	  [messageTypes.offer]: this.respondToOffer,
	  [messageTypes.answer]: this.saveSdpAnswer,
	  [messageTypes.iceCandidate]: this.addIceCandidate
  }

  


  

  private callPeers() {
    Object.values(this.state.peers).forEach(peer => this.initPeerConnection(peer))
  }

  createOffer = async (event, peerContext: PeerContext) => {
    console.log('Creating offer...')
    let { peerConnection, peer } = peerContext
    const offer = await peerConnection.createOffer();
  
    // if signaling state is not 'stable', then it means
    // we're already in the process of resolving local/remote SDPs
    // we don't want to create another offer in this case
    if (peerConnection.signalingState !== 'stable') {
      return;
    }
  
    await peerConnection.setLocalDescription(offer);

    console.log(peerConnection.localDescription);

    this.webSocketService.sendMsg({
      senderId: this.state.currentUser.userId,
      recipientId: peer.userId,
      type: messageTypes.offer,
      data: peerConnection.localDescription
    })
  }

  displayPeerMedia = (event, peerContext) => {
    console.log('Na Geh');
    // TODO: IMPLEMENT
    // setPeerVideoMediaStream(peerContext.peer.userId, event.streams[0])
    console.log(event.streams[0]);
    this.video.nativeElement.srcObject = event.streams[0];
    // this.insertVideo(event.streams[0])
  }

  sendIceCandidateToPeer = async (event: RTCPeerConnectionIceEvent, peerContext: PeerContext) => {
    console.log(event);
    console.log(event.candidate);
    if (event.candidate) {
      this.webSocketService.sendMsg(
        {
          senderId: this.state.currentUser.userId,
          type: messageTypes.iceCandidate,
          receipentId: peerContext.peer.userId,
          data: event.candidate
        }
      )
    }
  }

  handleICEConnectionStateChangeEvent = (event, peerContext) => {
    if (['closed', 'failed', 'disconnected'].includes(peerContext.peerConnection.iceConnectionState)) {
      this.disposePeerConnection(peerContext)
    }
  }

  handleSignalingStateChangeEvent = (event, peerContext) => {
    if (peerContext.peerConnection.signalingState === 'closed') {
      this.disposePeerConnection(peerContext)
    }
  }

  private initPeerConnection(peer) {
    // TODO: IMPLEMENT
    // insertVideoTemplate({
    //   label: peer.userName,
    //   parent: getPeerVideoContainer(),
    //   videoId: peer.userId
    // })

    
    let peerConnection = this.peerService.createPeerConnection(
      peer,
      this.state.localMediaStream,
      // when our local ICE agent finds a candidate
      this.sendIceCandidateToPeer,
      this.handleICEConnectionStateChangeEvent,
      this.handleSignalingStateChangeEvent,
      // this starts the calling process
      // this event is triggered when you add a tranceiver
      this.createOffer,
      // we get peer media here
      this.displayPeerMedia
    )

    console.log(peerConnection);

    this.state.peers[peer.userId] = {
      ...peer,
      peerConnection
    }
  
    return peerConnection
  }

  

  

  async joinCall() {    
    
    console.log(this.username);
    this.state.currentUser.userName = this.username;
    console.log(this.state.currentUser.userName);
    // hideCallSettings()
      
    this.sendJoinMessage()
  }

  sendJoinMessage() {
    this.webSocketService.sendMsg({
      senderId: this.state.currentUser.userId,
      type: messageTypes.join,
      userName: this.state.currentUser.userName
    })
  }

  async initLocalVideo(label) {
    // TODO: IMPLEMENT
    this.state.localMediaStream = await this.mediaService.getUserMedia();
    
    this.insertVideo(this.state.localMediaStream);
  }

  insertVideo(stream: MediaStream): void {
    let video = this.renderer.createElement('video');
    console.log(video);
    video.srcObject = stream;
    video.setAttribute('autoplay', true);
    video.setAttribute('muted', true);
    this.renderer.appendChild(this.container.nativeElement, video);
  }

  disposePeerConnection(peerContext) {
    // removePeerVideoTemplate(peerContext.peer.userId);
    this.peerService.closePeerConnection(peerContext.peerConnection);
  }

  

  


  

  public foo = (msg) => {
    console.log('Foo');
  }

   

  

  

  



}
