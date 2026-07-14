import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MapperConfiguration } from '@shared/interfaces/automapper.interface';
import { AutoMapperService } from '@shared/utils/automapper/automapper';

export interface FamiliarBackendDTO {
  tipo_documento: { codigo: string; descripcion: string; };
  numero_documento: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  tipo_parentesco: { codigo: string; descripcion: string; };
  telefono_contacto: string;
  correo_contacto: string;
}

export interface FamiliarFrontendModel {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  tipoParentesco: string;
  telefonoContacto: string;
  correoElectronico: string;
  nombreCompleto?: string;
}

export const familiarMapperConfig: MapperConfiguration<FamiliarBackendDTO, FamiliarFrontendModel> = {
  mappings: [
    { source: 'tipo_documento.codigo', target: 'tipoDocumento' },
    { source: 'numero_documento', target: 'numeroDocumento' },
    { source: 'nombre', target: 'nombre' },
    { source: 'primer_apellido', target: 'primerApellido' },
    { source: 'segundo_apellido', target: 'segundoApellido' },
    { source: 'tipo_parentesco.codigo', target: 'tipoParentesco' },
    { source: 'telefono_contacto', target: 'telefonoContacto' },
    { source: 'correo_contacto', target: 'correoElectronico' },
    {
      source: (src: any) => `${src.nombre} ${src.primer_apellido} ${src.segundo_apellido}`,
      target: 'nombreCompleto'
    }
  ],
  ignoreNullValues: false,
  ignoreUndefined: false
};

export const familiarReverseMapperConfig: MapperConfiguration<FamiliarFrontendModel, FamiliarBackendDTO> = {
  mappings: [
    { source: 'numeroDocumento', target: 'numero_documento' },
    { source: 'nombre', target: 'nombre' },
    { source: 'primerApellido', target: 'primer_apellido' },
    { source: 'segundoApellido', target: 'segundo_apellido' },
    { source: 'telefonoContacto', target: 'telefono_contacto' },
    { source: 'correoElectronico', target: 'correo_contacto' },
    {
      source: 'tipoDocumento',
      target: 'tipo_documento',
      transform: (codigo: string) => ({ codigo, descripcion: codigo })
    },
    {
      source: 'tipoParentesco',
      target: 'tipo_parentesco',
      transform: (codigo: string) => ({ codigo, descripcion: codigo })
    }
  ],
  ignoreNullValues: false,
  ignoreUndefined: false
};

@Injectable({ providedIn: 'root' })
export class FamiliarService {
  private baseUrl = 'https://api.example.com';

  constructor(private http: HttpClient, private mapper: AutoMapperService) {
    this.mapper.createMap('FamiliarToBackend', familiarReverseMapperConfig);
  }

  crearFamiliar(familiar: FamiliarFrontendModel): Observable<FamiliarBackendDTO> {
    const dto = this.mapper.map<FamiliarFrontendModel, FamiliarBackendDTO>('FamiliarToBackend', familiar);
    return this.http.post<FamiliarBackendDTO>(`${this.baseUrl}/familiares`, dto);
  }

  actualizarFamiliar(id: number, familiar: FamiliarFrontendModel): Observable<FamiliarBackendDTO> {
    const dto = this.mapper.map<FamiliarFrontendModel, FamiliarBackendDTO>('FamiliarToBackend', familiar);
    return this.http.put<FamiliarBackendDTO>(`${this.baseUrl}/familiares/${id}`, dto);
  }
}

@Component({ selector: 'app-autorizar-familiar', template: `...` })
export class AutorizarFamiliarComponent {
  formAutorizarFamiliar: FormGroup;

  constructor(private fb: FormBuilder, private mapper: AutoMapperService, private familiarService: FamiliarService) {
    this.formAutorizarFamiliar = this.fb.group({
      tipo_documento: ['', Validators.required],
      numero_documento: ['', Validators.required],
      nombre: ['', Validators.required],
      primer_apellido: ['', Validators.required],
      segundo_apellido: [''],
      tipo_parentesco: ['', Validators.required],
      telefono_contacto: ['', Validators.required],
      correo_electronico: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.formAutorizarFamiliar.valid) {
      const frontendData: FamiliarFrontendModel = {
        tipoDocumento: this.formAutorizarFamiliar.get('tipo_documento')?.value,
        numeroDocumento: this.formAutorizarFamiliar.get('numero_documento')?.value,
        nombre: this.formAutorizarFamiliar.get('nombre')?.value,
        primerApellido: this.formAutorizarFamiliar.get('primer_apellido')?.value,
        segundoApellido: this.formAutorizarFamiliar.get('segundo_apellido')?.value,
        tipoParentesco: this.formAutorizarFamiliar.get('tipo_parentesco')?.value,
        telefonoContacto: this.formAutorizarFamiliar.get('telefono_contacto')?.value,
        correoElectronico: this.formAutorizarFamiliar.get('correo_electronico')?.value
      };
      this.familiarService.crearFamiliar(frontendData).subscribe(
        (response: any) => console.log('Familiar creado', response),
        (error: any) => console.error('Error', error)
      );
    }
  }
}

@Component({ selector: 'app-editar-familiar', template: `...` })
export class EditarFamiliarComponent implements OnInit {
  formAutorizarFamiliar: FormGroup;
  familiarId: number = 1;

  constructor(private fb: FormBuilder, private mapper: AutoMapperService, private familiarService: FamiliarService) {
    this.formAutorizarFamiliar = this.fb.group({
      tipoDocumento: [''], numeroDocumento: [''], nombre: [''],
      primerApellido: [''], segundoApellido: [''], tipoParentesco: [''],
      telefonoContacto: [''], correoElectronico: ['']
    });
  }

  ngOnInit(): void {
    (this.familiarService as any).obtenerFamiliar?.(this.familiarId)?.subscribe(
      (backendData: FamiliarBackendDTO) => {
        const frontendData = this.mapper.mapDirect<FamiliarBackendDTO, FamiliarFrontendModel>(backendData, familiarMapperConfig);
        this.formAutorizarFamiliar.patchValue(frontendData);
      }
    );
  }

  onSubmit(): void {
    if (this.formAutorizarFamiliar.valid) {
      const formValue = this.formAutorizarFamiliar.value as FamiliarFrontendModel;
      this.familiarService.actualizarFamiliar(this.familiarId, formValue).subscribe(
        (response: any) => console.log('Familiar actualizado', response),
        (error: any) => console.error('Error', error)
      );
    }
  }
}
