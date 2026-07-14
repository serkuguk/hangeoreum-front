export interface UsuarioFrontendModel {
  id: number;
  id_usuario: number;
  uuid_usuario: string;
  centro: string;
  nombre: string;
  apellidos: string;
  numero_documento: string;
  primer_apellido: string;
  segundo_apellido: string;
  fecha_nacimiento: string;
  tipo_documento: string;
  sexo: string;
  status: {
    name: string;
    componentId: string;
    status: string;
    icon: string;
    iconColor: string;
    tag: string;
    textColor: string;
  };
  actions: {
    items: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
    }>;
  };
}
