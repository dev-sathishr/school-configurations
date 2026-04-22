import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-error500',
  imports: [AngularSvgIconModule, ButtonComponent],
  templateUrl: './error500.component.html',
  styleUrl: './error500.component.css',
})
export class Error500Component {
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
