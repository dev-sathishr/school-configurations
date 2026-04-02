import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableActionComponent } from './components/table-action/table-action.component';
import { TableFooterComponent } from './components/table-footer/table-footer.component';
import { TableHeaderComponent } from './components/table-header/table-header.component';
import { TableRowComponent } from './components/table-row/table-row.component';

@Component({
  standalone: true,
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [
    FormsModule, AngularSvgIconModule,
    TableActionComponent, TableFooterComponent, TableHeaderComponent, TableRowComponent,
  ],
})
export class TableComponent {
  data = input<any[]>([]);
  totalCount = input(0);
  filteredCount = input(0);
  loading = input(false);
  currentPage = input(1);
  pageSize = input(10);

  public toggleAll(checked: boolean) {}
}
