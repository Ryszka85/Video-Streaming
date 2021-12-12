import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserMediaService {

  constructor() { }

  public getUserMedia(): Promise<MediaStream> {
    return navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: ['user', 'environment'] },
          height: { ideal: 250 }
        }
      })
  }
}
