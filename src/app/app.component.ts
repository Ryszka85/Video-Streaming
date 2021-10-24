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
    this.http.get('77.116.152.165:8080/test')
      .subscribe(response => console.log(response));
  }


}
