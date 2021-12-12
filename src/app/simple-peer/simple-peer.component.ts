import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import * as Stomp from '@stomp/stompjs';
import { Observable } from 'rxjs';
import * as SimplePeer from 'simple-peer';
import * as SockJS from 'sockjs-client';
import { v4 as uuidv4 } from 'uuid';
// declare var SockJS: any;

const constraints = {
  audio: true,
  video: { width: 400, height: 400 }
}

export interface UserId {
  userId: string;
}

export interface User {
  userId: string;
  sessionId: string;
}

export interface Peer {
  peerId: string;
  peer: SimplePeer.Instance;
}

export interface UserJoined {
  callerId: string;
  signal: any;
}

export interface ReceivingSignal {
  id: string;
  signal: any;
}

@Component({
  selector: 'app-simple-peer',
  templateUrl: './simple-peer.component.html',
  styleUrls: ['./simple-peer.component.scss']
})
export class SimplePeerComponent implements OnInit {
  // socket: any;
  @ViewChild('local_video') localVideo: ElementRef;
  data: any;
  ws: any;
  id: UserId;
  userList: User[] = [];
  localStream: MediaStream;
  peers: Peer[] = [];

  @ViewChild('received_video') remoteVideo: ElementRef;
  @ViewChild('received_video2') remoteVideo2: ElementRef;

  constructor(private http: HttpClient) {}


  ngOnInit(): void {
    this.http.get<UserId>('http://localhost:8080/uuid')
              .subscribe(uuid => {
                console.log(uuid);
                this.id = uuid;                
                this.conn(this.id.userId);
              })

              // this.conn('123');
    
  }

  conn(userId: string) {
    var socket = new SockJS('http://localhost:8080/webSocket');
	  this.ws = Stomp.Stomp.over(socket);
    console.log(socket._generateSessionId())

    navigator.mediaDevices.getUserMedia(constraints)
        .then(
          stream => { 
            this.localStream = stream ;
            this.localVideo.nativeElement.srcObject = stream;
            // this.insertVideo(this.rtcState.mediaStream)
          }
        );

    var headers = {
      userId: userId
    };
	  this.ws.connect(headers, (frame: any) => {  

      this.ws.subscribe(`/user/${userId}/all-users`, (message: any)=> {
        const userList: User[] = JSON.parse(message.body);
        console.log(userList);
        this.userList = [ ...this.userList, ...userList ];
        const peersList = [];
        this.userList.forEach(user => {  
          console.log('About to create peer....')                
          const peer = this.createPeer(user.userId, userId, this.localStream)
          console.log('Created peer : ' + peer)
          peersList.push({ peerId: user.userId, peer });          
          console.log('Peer list size : ' + peersList.length);
        })
        console.log(this.peers);
        this.peers = peersList;
        console.log(this.peers);        
			  console.log(this.userList);
        console.log(message);
		  });

      
    
      
		  this.ws.subscribe(`/user/${userId}/messages`, (message: any)=> {
			  console.log(message.body);
        console.log(message)
        console.log(uuidv4())
		  });

      this.ws.subscribe(`/user/${userId}/user-joined`, (message: any)=> {
        const userJoined: UserJoined = JSON.parse(message.body);
			  console.log(userJoined);
        console.log(message)
        const peer = this.addPeer(userJoined.signal, userJoined.callerId, this.localStream);
        console.log(this.peers);
        const peerTemp2 = this.peers.find(p => p.peerId === userJoined.callerId);
        this.peers = this.peers.filter(peer => peer.peerId !== userJoined.callerId);
        peerTemp2.peer = peer;
        // if(peerTemp2) {
        //   this.peers = this.peers.filter(pTemp => pTemp.peerId !== userJoined.callerId);          
        // }  
        this.peers.push({peerId: userJoined.callerId, peer: peer})
        
        // this.peers = this.peers.map(peerTemp => ({...peerTemp, peer: peer}));
        console.log(this.peers);
		  }); 

      this.ws.subscribe(`/user/${userId}/receiving-returned-signal`, (message: any)=> {
        console.log('Returning Signal..')
        const rec: ReceivingSignal = JSON.parse(message.body);
        this.peers.forEach(p => console.log(p))
        const item = this.peers.find(peerTemp => peerTemp.peerId === rec.id);
        console.log(rec.signal)
        console.log(item);
        item.peer.signal(rec.signal);

        
        
        // this.remoteVideo.peer = item.peer;
        // this.peers.find(peerTemp => peerTemp.peerId ===)
        // const userJoined: UserJoined = JSON.parse(message.body);
			  // console.log(userJoined);
        // console.log(message)
        // const peer = this.addPeer(userJoined.signal, userJoined.callerId, this.localStream);
        // console.log(this.peers);
        // this.peers = this.peers.map(peerTemp => ({...peerTemp, peer: peer}));
        // console.log(this.peers);
		  });

      this.ws.send('/app/join-room', {}, JSON.stringify({userId: userId}));

      // this.ws.send(
      //   '/app/chat',
      //    {}, 
      //    JSON.stringify({senderId: userId, recipientId: userId, body: 'Foo'})
      // );

	  }, 
    (error: any)=> {
		  alert("STOMP error " + error);
	  });
  }

  private createPeer(userToSignal: string, callerId: string, stream: MediaStream): SimplePeer.Instance {
    const peer = new SimplePeer(
      {
        initiator: true,
        trickle: false,
        stream
      }
    )
    console.log(peer)
    peer.on("signal", signal => {
      console.log(signal);
      console.log(callerId);
      this.ws.send(
        '/app/sending-signal', 
        {},
        JSON.stringify({userToSignal: userToSignal, callerId: callerId, signal}));
    })
  
    return peer;

  }

  private addPeer(incomingSignal: any, callerId: string, stream: MediaStream): SimplePeer.Instance {
    console.log("AHAAA");
    const peer = new SimplePeer(
      {
        initiator: false,
        trickle: false,
        stream
      } 
    ) 

    peer.on("signal", signal => {
      console.log(signal); 
      console.log(callerId)
      this.ws.send(
        '/app/returning-signal', 
        {},
        JSON.stringify({ signal, callerId }));
    })

    peer.signal(incomingSignal);
    return peer;
  }

}
