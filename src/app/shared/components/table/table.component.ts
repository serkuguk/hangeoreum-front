import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    ContentChild, effect,
    input, OnInit,
    output,
    signal,
    TemplateRef,
    ViewChild
} from '@angular/core';
import {Table, TableModule} from "primeng/table";
import {TranslateModule} from "@ngx-translate/core";
import {DatePipe, NgTemplateOutlet} from "@angular/common";
import {ButtonComponent} from "@shared/components/button/button.component";
import {SortEvent} from "primeng/api";
import {FormFieldComponent} from "@shared/components/controls/form-field/form-field.component";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {BasicInputComponent} from "@shared/components/controls/basic-input/basic-input.component";

type ColumnType =
    | 'datetime' | 'date' | 'date-mes' | 'date-reverse'
    | 'icon' | 'decimal' | 'clickable' | 'number' | 'text' | 'especial';

export interface TableColumn {
    field: string;
    header: string;
    width?: string;
    minWidth?: string;
    textAlign?: 'left' | 'center' | 'right';
    type: ColumnType;
    visible?: boolean;
    modificable?: boolean;
}

interface IOutputRow {
    row: any[],
    rowIndex: number
}

export interface TableRowUpdateEvent {
    data: TableRow;
    field: string;
    newValue: any;
}

export interface TableRowSelectEvent {
    data: TableRow;
    index: number;
}

export interface TableRow {
    [key: string]: any;
    _editing?: boolean;
    _originalData?: any;
}

@Component({
    selector: 'app-table',
    standalone: true,
    imports: [
        TableModule,
        TranslateModule,
        NgTemplateOutlet,
        DatePipe,
        ButtonComponent,
        FormFieldComponent,
        ReactiveFormsModule,
        BasicInputComponent
    ],
    templateUrl: './table.component.html',
    styleUrl: './table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableComponent implements OnInit {

    rows = 10;
    private currentlyEditingRow: TableRow | null = null;
    private readonly originalByRow = new WeakMap<TableRow, Partial<TableRow>>();

    // Local signal to track the index of the currently editing row
    private editingRowIndex = signal<number | null>(null);

    dataSource = input<TableRow[]>([]);

    // Computed signal that enriches data with _editing flag without mutating input
    enrichedDataSource = computed(() => {
        const data = this.dataSource();
        const editIndex = this.editingRowIndex();

        if (editIndex === null) {
            return data;
        }

        return data.map((row, index) => ({
            ...row,
            _editing: index === editIndex
        }));
    });
    dataSourceColumns = input<TableColumn[]>([]);
    iconColor = input<string>('');
    iconClass = input<string>('');
    msgTooltip = input<string>('');
    paginator = input<boolean>(false);
    selectionMode = input<"single" | "multiple" | undefined | null>(null);
    scrollable = input<boolean>(true);
    metaKeySelection = input<boolean>();
    resizableColumns = input<boolean>(false);
    selectedRowValue = input<null | any[]>();
    showIconSort = input<boolean>(true);
    showRowActions = input<boolean>(true);
    showIconCondition = input<boolean>(false);
    showFilterCondition = input<string>();
    editableFieldName = input<string>(); // Optional: explicitly specify which field is editable
    customSortFun = false;
    initialForm!: FormGroup;

    //outputs
    selectRow = output<{ row: TableRow, rowIndex: number }>();
    unselectRow = output<null>();
    cellEdit = output<any>();
    rowUpdate = output<TableRowUpdateEvent>();

    @ViewChild('table') table!: Table;
    @ContentChild('customCellTemplate') customCellTemplate: TemplateRef<any> | undefined;

    constructor(private readonly cd: ChangeDetectorRef, private readonly fb: FormBuilder) {
        effect(() => {
            const ds = this.enrichedDataSource();
            if (ds?.length && this.table) {
                this.table.first = 0;
            }
        });
    }

    ngOnInit() {
        this.initialForm = this.fb.group({
            inputValue: [
                { value: null, disabled: false },
                { validators: [Validators.required] },
            ],
        });
    }

    public onSelectedRow(event: TableRowSelectEvent): void {
        this.selectRow.emit({row: event.data, rowIndex: event.index});
    }

    onRowUnselect(): void {
        this.unselectRow.emit(null);
    }

    onCustomSort(event: SortEvent): void {
        const { data, field, order } = event;
        if (!field) return;

        const col = this.dataSourceColumns().find(c => c.field === field);
        if (!col) return;

        if (!data) return;

        data.sort((a: TableRow, b: TableRow) => {
            const av = a[field];
            const bv = b[field];

            if (this.isDateType(col.type)) {
                const ad = new Date(av);
                const bd = new Date(bv);
                return (ad.getTime() - bd.getTime()) * (order ?? 1);
            }
            if (typeof av === 'number' && typeof bv === 'number') {
                return (av - bv) * (order ?? 1);
            }
            return String(av).localeCompare(String(bv)) * (order ?? 1);
        });
    }

    private takeSnapshot(row: TableRow): void {
        const snap: Partial<TableRow> = {};
        (this.dataSourceColumns() || [])
            .filter(c => c && c.modificable)
            .forEach(c => snap[c.field] = row[c.field]);
        this.originalByRow.set(row, snap);
    }

    private revertFromSnapshot(row: TableRow): void {
        const snap = this.originalByRow.get(row);
        if (snap) {
            Object.keys(snap).forEach(k => row[k] = snap[k]);
            this.originalByRow.delete(row);
        }
    }

    /**
     * Determines the field name to edit.
     * Priority: 1) explicit editableFieldName input, 2) first modificable column
     */
    private getEditableField(): string | null {
        // First, check if editableFieldName is explicitly provided
        const explicitField = this.editableFieldName();
        if (explicitField) {
            return explicitField;
        }

        // Otherwise, find the first modificable column
        const modificableCol = this.dataSourceColumns().find(col => col.modificable);
        return modificableCol?.field ?? null;
    }

    /**
     * Determines if a column type is a date type
     */
    private isDateType(type: ColumnType): boolean {
        return type === 'date' || type === 'datetime' || type === 'date-mes' || type === 'date-reverse';
    }

    /**
     * Determines if a column should use custom cell template
     */
    shouldUseCustomCell(col: TableColumn): boolean {
        return this.isDateType(col.type)
            || col.type === 'icon'
            || col.type === 'decimal'
            || col.type === 'clickable';
    }

    public startEdit(row: TableRow, rowIndex: number): void {
        // Dynamically get the editable field instead of hardcoding 'Valor'
        const editableField = this.getEditableField();
        if (!editableField) {
            console.warn('No editable field found. Make sure at least one column has modificable: true or provide editableFieldName input.');
            return;
        }

        this.initialForm.controls.inputValue.setValue(row[editableField]);

        // If another row was being edited, revert its changes
        if (this.currentlyEditingRow && this.currentlyEditingRow !== row) {
            this.revertFromSnapshot(this.currentlyEditingRow);
        }

        // Update the editing index signal (no mutation of input data)
        this.editingRowIndex.set(rowIndex);
        this.takeSnapshot(row);
        this.currentlyEditingRow = row;

        this.cd.markForCheck();
    }

    public confirmEdit(row: TableRow): void {
        const editableField = this.getEditableField();
        if (!editableField) {
            console.warn('No editable field found.');
            return;
        }

        // Clear the editing state
        this.editingRowIndex.set(null);
        this.originalByRow.delete(row);
        this.currentlyEditingRow = null;

        this.rowUpdate.emit({
            data: row,
            field: editableField,
            newValue: this.initialForm.controls.inputValue.value,
        });
    }

    public cancelEdit(row: TableRow): void {
        const snap = this.originalByRow.get(row);
        if (snap) {
            Object.keys(snap).forEach(k => row[k] = snap[k]);
            this.originalByRow.delete(row);
        }

        // Clear the editing state
        this.editingRowIndex.set(null);
        this.currentlyEditingRow = null;
        this.cd.markForCheck();
    }

}
