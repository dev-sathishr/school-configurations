import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-student',
  template: '<router-outlet></router-outlet>',
  imports: [RouterOutlet],
})
export class StudentComponent {}
