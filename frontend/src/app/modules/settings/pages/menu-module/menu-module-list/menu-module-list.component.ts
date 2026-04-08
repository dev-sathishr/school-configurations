import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-menu-module-list',
  templateUrl: './menu-module-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class MenuModuleListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/menu-modules';
  deleteUrl = '/menu-modules/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'mod.name', label: 'Module', sortable: true, searchable: true },
    { key: 'men.name', label: 'Menu', sortable: true, searchable: true },
    { key: 'mm.display_order', label: 'Order', sortable: true },
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'mod.name': 'module_name', 'men.name': 'menu_name',
    'mm.display_order': 'display_order', 'created_by_name': 'created_by_name',
  };

  constructor(private cs: CommonService) {}

  addNew() { this.cs.navigate({ url: '/settings/menu-module/new' }); }
  editSelected(item: any) { this.cs.navigate({ url: `/settings/menu-module/${item.id}/edit` }); }
}
