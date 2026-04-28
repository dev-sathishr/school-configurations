import { Component, OnInit, ViewChild } from '@angular/core';
import { PermissionService } from '../../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DesignationFormComponent } from './designation/designation-form/designation-form.component';
import { DesignationListComponent } from './designation/designation-list/designation-list.component';
import { EmployeeCategoryFormComponent } from './employee-category/employee-category-form/employee-category-form.component';
import { EmployeeCategoryListComponent } from './employee-category/employee-category-list/employee-category-list.component';
import { EmployeeGroupFormComponent } from './employee-group/employee-group-form/employee-group-form.component';
import { EmployeeGroupListComponent } from './employee-group/employee-group-list/employee-group-list.component';

type EmployeeMasterTabKey = 'employee-category' | 'employee-group' | 'designation';

interface EmployeeMasterFormComponent {
  openCreate(): void;
  openEdit(id: string): void;
  openView(id: string): void;
}

interface EmployeeMasterTabConfig {
  key: EmployeeMasterTabKey;
  label: string;
  entityLabel: string;
  moduleCode: string;
}

@Component({
  selector: 'app-employee-master',
  templateUrl: './employee-master.component.html',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ButtonComponent,
    EmployeeCategoryListComponent,
    EmployeeCategoryFormComponent,
    EmployeeGroupListComponent,
    EmployeeGroupFormComponent,
    DesignationListComponent,
    DesignationFormComponent,
  ],
})
export class EmployeeMasterComponent implements OnInit {
  @ViewChild(EmployeeCategoryListComponent) categoryList?: EmployeeCategoryListComponent;
  @ViewChild(EmployeeGroupListComponent) groupList?: EmployeeGroupListComponent;
  @ViewChild(DesignationListComponent) designationList?: DesignationListComponent;
  @ViewChild(EmployeeCategoryFormComponent) categoryForm?: EmployeeCategoryFormComponent;
  @ViewChild(EmployeeGroupFormComponent) groupForm?: EmployeeGroupFormComponent;
  @ViewChild(DesignationFormComponent) designationForm?: DesignationFormComponent;

  readonly tabs: EmployeeMasterTabConfig[] = [
    {
      key: 'employee-category',
      label: 'Employee Category',
      entityLabel: 'Employee Category',
      moduleCode: 'EMPLOYEE_CATEGORIES',
    },
    {
      key: 'employee-group',
      label: 'Employee Group',
      entityLabel: 'Employee Group',
      moduleCode: 'EMPLOYEE_GROUPS',
    },
    {
      key: 'designation',
      label: 'Designation',
      entityLabel: 'Designation',
      moduleCode: 'DESIGNATIONS',
    },
  ];

  activeTab: EmployeeMasterTabKey = 'employee-category';

  constructor(public ps: PermissionService) {}

  ngOnInit(): void {
    if (this.visibleTabs.length > 0) {
      this.activeTab = this.visibleTabs[0].key;
    }
  }

  get visibleTabs(): EmployeeMasterTabConfig[] {
    return this.tabs.filter((tab) => this.ps.hasAnyPermission(tab.moduleCode));
  }

  get currentTab(): EmployeeMasterTabConfig | null {
    return this.visibleTabs.find((tab) => tab.key === this.activeTab) || this.visibleTabs[0] || null;
  }

  setActiveTab(tabKey: EmployeeMasterTabKey): void {
    this.activeTab = tabKey;
  }

  addNew(): void {
    if (!this.currentTab || !this.ps.canCreate(this.currentTab.moduleCode)) return;
    this.openFormForActiveTab('create');
  }

  editSelected(row: any): void {
    if (!this.currentTab || !this.ps.canEdit(this.currentTab.moduleCode)) return;
    this.openFormForActiveTab('edit', row?.id);
  }

  viewSelected(row: any): void {
    if (!this.currentTab || !this.ps.canView(this.currentTab.moduleCode)) return;
    this.openFormForActiveTab('view', row?.id);
  }

  onCategorySaved(): void {
    this.categoryList?.reload();
  }

  onGroupSaved(): void {
    this.groupList?.reload();
  }

  onDesignationSaved(): void {
    this.designationList?.reload();
  }

  private get activeForm(): EmployeeMasterFormComponent | undefined {
    if (this.activeTab === 'employee-category') return this.categoryForm;
    if (this.activeTab === 'employee-group') return this.groupForm;
    return this.designationForm;
  }

  private openFormForActiveTab(mode: 'create' | 'edit' | 'view', id?: string): void {
    const formComponent = this.activeForm;
    if (!formComponent) return;

    if (mode === 'create') {
      formComponent.openCreate();
      return;
    }

    if (!id) return;
    if (mode === 'edit') {
      formComponent.openEdit(id);
      return;
    }
    formComponent.openView(id);
  }
}
