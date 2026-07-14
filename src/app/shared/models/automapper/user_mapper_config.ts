import {UsuarioBackendDTO} from "@shared/interfaces/automapper/user-backand-dto.interface";
import {UsuarioFrontendModel} from "@shared/interfaces/automapper/user-frontend.interface";
import {MapperConfiguration} from "@shared/interfaces/automapper.interface";

export const usuarioMapperConfig: MapperConfiguration<UsuarioBackendDTO, UsuarioFrontendModel> = {
  mappings: [
    // Campos simples
    { source: 'id_usuario', target: 'id_usuario' },
    { source: 'uuid_usuario', target: 'uuid_usuario' },
    { source: 'nombre', target: 'nombre' },
    { source: 'numero_documento', target: 'numero_documento' },
    { source: 'primer_apellido', target: 'primer_apellido' },
    { source: 'segundo_apellido', target: 'segundo_apellido' },
    { source: 'fecha_nacimiento', target: 'fecha_nacimiento' },

    // Campos anidados simples
    { source: 'tipo_documento.codigo', target: 'tipo_documento' },
    { source: 'sexo.descripcion', target: 'sexo' },

    // Campo compuesto: centro
    {
      source: (src) => src.centro,
      target: 'centro',
      transform: (centro) => `${centro?.codigo} - ${centro?.descripcion}`
    },

    // Campo compuesto: apellidos
    {
      source: (src) => ({ primer: src.primer_apellido, segundo: src.segundo_apellido }),
      target: 'apellidos',
      transform: (apellidos) => `${apellidos.primer} ${apellidos.segundo}`
    },

    // Generar ID autoincremental (esto normalmente se hace fuera del mapper)
    {
      source: 'id_usuario',
      target: 'id',
      transform: (value) => value // O puedes generar un índice aquí si lo necesitas
    },

    // Objeto complejo: status
    {
      source: (src) => src.estado,
      target: 'status',
      transform: (estado) => ({
        name: 'tag-notif-01',
        componentId: 'tag-notif-01',
        status: estado?.descripcion || '',
        icon: 'bullet',
        iconColor: 'draft',
        tag: 'default',
        textColor: 'black',
      })
    },

    // Objeto complejo: actions (valores estáticos)
    {
      source: (src) => src, // Tomamos todo el objeto source
      target: 'actions',
      transform: () => ({
        items: [
          { id: 'detalle', label: 'Ver detalle', icon: '', action: '' },
          { id: 'estancias', label: 'Gestionar estancias', icon: '', action: '' },
        ],
      })
    },
  ],
  ignoreNullValues: false,
  ignoreUndefined: false
};
