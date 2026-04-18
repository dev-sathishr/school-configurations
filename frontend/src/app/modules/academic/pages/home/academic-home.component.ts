import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService } from '../../../../core/services/permission.service';

interface AcademicCard {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  moduleCode: string;
}

@Component({
  selector: 'app-academic-home',
  template: `
    <div>
      <div class="mb-6">
        <h2 class="text-foreground text-xl font-semibold">Academic</h2>
        <p class="text-muted-foreground text-sm">Manage your school academic configuration</p>
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @for (card of cards; track card.route) {
          <div
            (click)="navigate(card)"
            class="bg-background border-muted/30 hover:border-primary/30 hover:shadow-md group flex cursor-pointer flex-col items-center rounded-xl border p-6 text-center transition-all duration-200">
            <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-lg {{ card.color }}">
              <svg-icon [src]="card.icon" [svgClass]="'h-6 w-6'"></svg-icon>
            </div>
            <h3 class="text-foreground group-hover:text-primary text-sm font-semibold">{{ card.label }}</h3>
            <p class="text-muted-foreground mt-1 text-xs leading-relaxed">{{ card.description }}</p>
          </div>
        }
      </div>
    </div>
  `,
  imports: [AngularSvgIconModule],
})
export class AcademicHomeComponent implements OnInit {
  private allCards: AcademicCard[] = [
    {
      icon: 'assets/icons/heroicons/outline/table-cells.svg',
      label: 'Classes',
      description: 'Manage classes, sections and academic levels',
      route: '/academic/class',
      color: 'bg-blue-500/10 text-blue-600',
      moduleCode: 'CLASSES',
    },
  ];

  cards: AcademicCard[] = [];

  constructor(private router: Router, private permissionService: PermissionService) {}

  ngOnInit(): void {
    this.cards = this.allCards.filter((card) => this.permissionService.hasAnyPermission(card.moduleCode));
  }

  navigate(card: AcademicCard) {
    this.router.navigate([card.route]);
  }
}
