import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { API } from '../../../../../core/api/endpoints';

@Component({
  selector: 'app-menu-module-list',
  templateUrl: './menu-module-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class MenuModuleListComponent extends BaseListComponent {
  apiUrl = API.menuModules.base;
  override deleteUrl = API.menuModules.deleteMultiple;
  routeBase = '/settings/menu-module';

  columns: ColumnConfig[] = [
    { key: 'mod.name', label: 'Module', sortable: true, searchable: true },
    { key: 'men.name', label: 'Menu', sortable: true, searchable: true },
    { key: 'mm.display_order', label: 'Order', sortable: true },
  ];

  displayKeyMap: Record<string, string> = {
    'mod.name': 'module_name', 'men.name': 'menu_name',
    'mm.display_order': 'display_order',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['mod.name'] = row.module?.name || '-';
    mapped['men.name'] = row.menu?.name || '-';
    return mapped;
  };
}
