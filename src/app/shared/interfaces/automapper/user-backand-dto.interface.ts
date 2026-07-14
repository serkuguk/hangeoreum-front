export interface UsuarioBackendDTO {
  id_usuario: number;
  uuid_usuario: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  numero_documento: string;
  fecha_nacimiento: string;
  tipo_documento: {
    codigo: string;
    descripcion: string;
  };
  sexo: {
    codigo: string;
    descripcion: string;
  };
  estado: {
    codigo: string;
    descripcion: string;
  };
  centro: {
    codigo: string;
    descripcion: string;
  };
}
