import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { TestingService } from './testing.service';





@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  element: any;
  title = 'Video-Streaming';
  
  constructor(private http: HttpClient, private s: TestingService) {
    console.log('Stinkendes Gesindel!!'); 
    this.s.test().subscribe(resp => {
      this.element = resp;
      console.log(resp);
    })
  }


}
