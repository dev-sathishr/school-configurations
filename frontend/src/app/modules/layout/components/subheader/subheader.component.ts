import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuService } from '../../services/menu.service';

@Component({
  selector: 'app-subheader',
  templateUrl: './subheader.component.html',
  imports: [RouterLink, RouterLinkActive],
})
export class SubheaderComponent {
  constructor(public menuService: MenuService) {}
}
