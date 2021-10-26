import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TestingService {

  constructor(private httpClient: HttpClient) { }

  public test(): Observable<any> {
    console.log('HuHu!!NIGGGER');
    return this.httpClient.get( environment.endpointPrefix + 'test');
  }
}
