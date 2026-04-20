import { Component, OnInit } from '@angular/core';
import { Event, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SubheaderComponent } from './components/subheader/subheader.component';
import { ThemeService } from '../../core/services/theme.service';
import { UsageTrackingService } from '../../core/services/usage-tracking.service';
import { MenuService } from './services/menu.service';
import { LoadingBarComponent } from '../../shared/components/loading-bar/loading-bar.component';
import { SessionTimeoutWarningComponent } from '../../shared/components/session-timeout-warning/session-timeout-warning.component';
import { ConfirmHostComponent } from '../../shared/components/confirm-host/confirm-host.component';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  imports: [
    SidebarComponent, NavbarComponent, RouterOutlet, FooterComponent, SubheaderComponent,
    LoadingBarComponent, SessionTimeoutWarningComponent, ConfirmHostComponent,
  ],
})
export class LayoutComponent implements OnInit {
  private mainContent: HTMLElement | null = null;

  constructor(
    private router: Router,
    public themeService: ThemeService,
    public menuService: MenuService,
    private usageTracking: UsageTrackingService,
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        if (this.mainContent) {
          this.mainContent!.scrollTop = 0;
        }
      }
    });
    this.usageTracking.start();
  }

  ngOnInit(): void {
    this.mainContent = document.getElementById('main-content');
  }
}
