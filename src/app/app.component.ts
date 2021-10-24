import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';





@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'Video-Streaming';
  
  constructor(private http: HttpClient) {
    this.http.get(environment.endpointPrefix + 'test')
      .subscribe(response => console.log(response));
  }


}
