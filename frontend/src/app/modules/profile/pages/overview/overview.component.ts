import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService, User } from '../../../../core/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  imports: [DatePipe],
})
export class OverviewComponent implements OnInit {
  public user: User | null = null;
  public profileImageUrl: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (this.user?.profile_file_id) {
      const token = this.authService.getToken();
      this.profileImageUrl = `${environment.apiUrl}/files/${this.user.profile_file_id}?token=${token}`;
    }
  }

  get userInitial(): string {
    return (this.user?.full_name || '?').charAt(0).toUpperCase();
  }
}
