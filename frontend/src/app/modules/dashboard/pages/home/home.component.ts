import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  readonly displayName = this.auth.currentUser?.full_name || this.auth.currentUser?.username || 'there';
}
