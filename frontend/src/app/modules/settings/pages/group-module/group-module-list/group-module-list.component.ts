import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';

@Component({
  selector: 'app-group-module-list',
  templateUrl: './group-module-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class GroupModuleListComponent extends BaseListComponent {
  apiUrl = '/group-modules';
  override deleteUrl = '/group-modules/delete-multiple';
  routeBase = '/settings/group-module';

  columns: ColumnConfig[] = [
    { key: 'g.name', label: 'Group', sortable: true, searchable: true },
    { key: 'men.name', label: 'Menu', sortable: true, searchable: true },
  ];

  displayKeyMap: Record<string, string> = {
    'g.name': 'group_name', 'men.name': 'menu_name',
  };
}
