import { CommonModule, Location } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-error403',
  imports: [CommonModule, AngularSvgIconModule, ButtonComponent],
  templateUrl: './error403.component.html',
  styleUrl: './error403.component.css',
})
export class Error403Component {
  requestedPath = '';
  heading = 'Access Denied';
  description = 'You do not have permission to open this page.';

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    this.requestedPath = this.activatedRoute.snapshot.queryParamMap.get('from') ?? '';
    const reason = this.activatedRoute.snapshot.queryParamMap.get('reason');

    if (reason === 'permission') {
      this.description = 'Your account is signed in, but this action is not allowed for your current role.';
    }
  }

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
