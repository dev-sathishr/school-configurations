import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-error404',
  imports: [AngularSvgIconModule, ButtonComponent],
  templateUrl: './error404.component.html',
  styleUrl: './error404.component.css',
})
export class Error404Component {
  constructor(
    private router: Router,
    private location: Location
  ) {}

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToHomePage();
  }

  goToHomePage(): void {
    this.router.navigate(['/']);
  }
}
