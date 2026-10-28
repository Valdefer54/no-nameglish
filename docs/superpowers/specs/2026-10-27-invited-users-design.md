# Cuentas por invitación

El propietario crea las cuentas de invitados. Cada cuenta entra con usuario y contraseña propios; el registro público permanece deshabilitado. Better Auth guardará usuarios, credenciales y sesiones en el PostgreSQL existente mediante Drizzle. Se conservan los componentes y el estilo de la aplicación.

Se eligieron cuentas por invitación frente a registro abierto o acceso con Google: permiten controlar quién consume la clave compartida de DeepSeek sin configurar un proveedor externo. La clave permanece exclusivamente en el servidor. Las rutas de IA también exigen una sesión válida.

Cada tarjeta y sesión de estudio pertenece a un usuario; todas las consultas, estadísticas y revisiones validan esa pertenencia. Las cuentas nuevas reciben copias del vocabulario inicial con progreso nuevo. La preparación de la base de datos crea la cuenta administradora y le asigna las tarjetas y sesiones antiguas en una transacción, sin borrar datos. Nunca se asignan datos antiguos al primer visitante.

El administrador dispone de una pantalla para crear cuentas con contraseñas iniciales. Cada usuario puede cambiar su propia contraseña y cerrar sesión. No se agrega envío de correos ni registro público. La configuración inicial requiere credenciales del propietario mediante variables de entorno, sin secretos en Git.

La implementación incluye pruebas de acceso, aislamiento entre dos usuarios, migración y API de IA sin autenticar. No se publica en producción hasta tener preparada la base de datos y revisado el cambio.

## Ampliación solicitada: vocabulario básico

El propietario necesita una cuenta invitada para una persona que empieza casi desde cero. Se agrega un catálogo persistente de 300 entradas originales: 100 A1, 100 A2 y 100 B1, con traducciones y pistas en español. Las etiquetas de nivel son orientativas. Al crear cuentas se elige básico o avanzado; los invitados reciben básico por defecto y el propietario conserva avanzado. Los nuevos elementos se presentan por orden A1 → A2 → B1, sin interferir con repasos pendientes. La IA recibe el nivel de la cuenta desde la sesión del servidor. Se conserva la lista avanzada y no se presenta la selección propia como un catálogo oficial de Oxford.

## Identidad del propietario

El usuario eligió `valdefer` como nombre de acceso. Tanto el propietario como los invitados entran con usuario y contraseña, sin correo real. Better Auth conserva un identificador de correo interno bajo el dominio reservado `.invalid`; el nombre visible y el acceso usan el plugin de usuario. Los usuarios no pueden cambiar ese identificador desde los endpoints públicos.
