import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-group-module-list',
  templateUrl: './group-module-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class GroupModuleListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/group-modules';
  deleteUrl = '/group-modules/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'g.name', label: 'Group', sortable: true, searchable: true },
    { key: 'men.name', label: 'Menu', sortable: true, searchable: true },
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'g.name': 'group_name', 'men.name': 'menu_name',
    'created_by_name': 'created_by_name',
  };

  constructor(private cs: CommonService) {}

  addNew() { this.cs.navigate({ url: '/settings/group-module/new' }); }
  editSelected(item: any) { this.cs.navigate({ url: `/settings/group-module/${item.id}/edit` }); }
}
