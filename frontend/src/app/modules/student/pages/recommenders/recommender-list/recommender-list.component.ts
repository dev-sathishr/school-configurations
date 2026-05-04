import { Component } from '@angular/core';
import { API } from '../../../../../core/api/endpoints';
import { RECOMMENDER_CATEGORY_BADGES, STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-recommender-list',
  templateUrl: './recommender-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class RecommenderListComponent extends BaseListComponent {
  apiUrl    = API.recommenders.base;
  override deleteUrl = API.recommenders.deleteMultiple;
  routeBase = '/student/recommenders';

  columns: ColumnConfig[] = [
    { key: 'name',        label: 'Name',        sortable: true },
    { key: 'category',    label: 'Category',    type: 'badge', badgeMap: RECOMMENDER_CATEGORY_BADGES, sortable: true },
    { key: 'contact_no',  label: 'Contact No',  sortable: true },
    { key: 'email',       label: 'Email',       sortable: false },
    { key: 'occupation',  label: 'Occupation',  sortable: false },
    { key: 'is_active',   label: 'Status',      type: 'badge', badgeMap: STATUS_BADGES, sortable: true },
  ];

  displayKeyMap: Record<string, string> = {
    name:       'name',
    category:   'category',
    contact_no: 'contact_no',
    email:      'email',
    occupation: 'occupation',
    is_active:  'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['is_active'] = statusLabel(row.is_active);
    return mapped;
  };
}
