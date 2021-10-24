import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TestingService {

  constructor(private httpClient: HttpClient) { }

  public test(): Observable<any> {
    console.log('HuHu');
    return this.httpClient.get('https://77.116.152.165:8443/test');
  }
}
