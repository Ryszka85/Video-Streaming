import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import { Subject } from 'rxjs';

export const WS_ENDPOINT = environment.wsEndpoint;

export const messageTypes = {
	signalServerConnected: 'signal-server-connected',
	join: 'join',
	userList: 'user-list',
	offer: 'offer',
	answer: 'answer',
	iceCandidate: 'ice-candidate',
}

export interface BaseMsg {
  senderId: string;
}

export interface SocketMessage extends BaseMsg {
  type: string;
  data: any;
  receipentId: string;
}

export interface Message {
  type: string;
  data: any;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  private socket$: WebSocketSubject<Message | any>;

  private messagesSubject = new Subject<any>();
  public messages$ = this.messagesSubject.asObservable();

  /**
   * Creates a new WebSocket subject and send it to the messages subject
   * @param cfg if true the observable will be retried.
   */
  public connect(): void {

    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();

      this.socket$.subscribe(
        // Called whenever there is a message from the server
        msg => {
          console.log('Received message of type: ' + msg.type);
          
          this.messagesSubject.next(msg);
        }
      );
    }
  }

  public connectToWebsocket(messageHandlers): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();

      this.socket$.subscribe(
        // Called whenever there is a message from the server
        msg => {
          // console.log('Received message of type: ' + msg);
          this.messagesSubject.next(msg);
          console.log(msg.type);

          if(msg.type === 'answer') {
            console.log('na serwas');
          }

          let messageHandler = messageHandlers[msg.type];
          
          if(messageHandler) {
            console.log('Starting to handle message....');
             messageHandler(msg); 
          }

        }
      );
    }
  }

  sendMsg(msg: SocketMessage | any): void {
    console.log('sending message: ' + msg.type);
    this.socket$.next(msg);
  }

  sendMessage(msg: Message | any): void {
    console.log('sending message: ' + msg.type);
    this.socket$.next(msg);
  }

  /**
   * Return a custom WebSocket subject which reconnects after failure
   */
  private getNewWebSocket(): WebSocketSubject<any> {
    return webSocket({
      url: WS_ENDPOINT,
      openObserver: {
        next: () => {
          console.log('[DataService]: connection ok');
        }
      },
      closeObserver: {
        next: () => {
          console.log('[DataService]: connection closed');
          this.socket$ = undefined;
          this.connect();
        }
      }
    });
  }

}
