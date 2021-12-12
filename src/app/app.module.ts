import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RoomViewComponent } from './room-view/room-view.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import { RoomComponent } from './room/room.component';
import {MatIconModule} from '@angular/material/icon';
import { VideoRoomComponent } from './video-room/video-room.component';
import {MatFormFieldModule} from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { AnotherRoomComponent } from './another-room/another-room.component';
import { SimplePeerComponent } from './simple-peer/simple-peer.component';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

// const config: SocketIoConfig = { url: 'http://localhost:8080/webSocket'};

@NgModule({
  declarations: [
    AppComponent,
    RoomViewComponent,
    RoomComponent,
    VideoRoomComponent,
    AnotherRoomComponent,
    SimplePeerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
