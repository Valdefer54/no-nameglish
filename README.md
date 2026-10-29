# no-nameglish

Entrenador de vocabulario con repetición espaciada. Next.js 16.4.3, PostgreSQL, Drizzle y Better Auth. Requiere Node.js 22 o superior; Vercel usa Node.js 24.

## Cuentas y vocabulario

El acceso es por invitación, con nombre de usuario y contraseña; no requiere correo electrónico. El administrador crea cuentas desde **Users**; no hay registro público. Cada persona tiene tarjetas, revisiones, sesiones, racha y estadísticas independientes. Cada usuario puede cambiar su contraseña en **Account** y cerrar sesión.

Al crear una cuenta se elige:

- **Beginner · A1 → B1**: 300 palabras y expresiones de uso cotidiano, 100 por nivel, con ejemplos originales cortos, significados y pistas en español. El catálogo compartido vive en la tabla `vocabulary`; las tarjetas y el progreso son privados. Se presentan primero las palabras nuevas A1, después A2 y B1, dando prioridad a los repasos pendientes. Las sesiones básicas contienen hasta 10 tarjetas.
- **Advanced · B2–C1**: vocabulario avanzado y las cinco categorías originales, hasta 25 tarjetas por sesión.

La cuenta administradora conserva el nivel avanzado y sus datos anteriores. La lista básica es una selección propia con niveles orientativos, no una lista oficial de Oxford ni una certificación de B1. Complementa la práctica de comprensión, gramática y conversación.

Todas las cuentas usan la misma `DEEPSEEK_API_KEY`, exclusivamente desde el servidor. Las rutas de IA exigen una sesión válida. La generación de frases y las correcciones se adaptan al nivel; para principiantes las explicaciones son en español. `GROQ_API_KEY` se utiliza únicamente para transcripción de audio.

## Preparar una instalación existente o nueva

1. Instala dependencias con `npm ci`.
2. Copia `.env.example` a `.env.local` y configura `POSTGRES_URL`, `BETTER_AUTH_URL` y `BETTER_AUTH_SECRET` (genera el secreto con `openssl rand -base64 32`). Conserva tu clave de DeepSeek existente.
3. En `.env.local`, define `OWNER_USERNAME`, `OWNER_NAME` y `OWNER_PASSWORD` (12–128 caracteres) para tu cuenta administradora. No compartas estas credenciales ni las subas a Git.
4. Ejecuta `npm run db:setup-users` **antes de desplegar la nueva versión**.
5. Ejecuta `npm run dev` y abre [localhost:3001](http://localhost:3001). Entra con la cuenta administradora y crea al invitado desde **Users**, seleccionando **Beginner · A1 → B1**.

`db:setup-users` aplica las migraciones, crea el administrador, asigna a esa cuenta las tarjetas y sesiones antiguas, impone la pertenencia por usuario y carga el catálogo básico en una sola transacción. No elimina datos. Puede repetirse sin duplicar el catálogo, reiniciar tarjetas ni cambiar la contraseña de una cuenta existente. No usa al primer visitante como propietario. Si ya hay un administrador, debes usar el mismo `OWNER_USERNAME`.

Después de provisionar puedes retirar `OWNER_PASSWORD` del archivo local. Solo vuelve a ser necesaria para repetir el comando (no restablece contraseñas existentes). Para cambios de esquema posteriores usa `npm run db:migrate`; no uses `db:push` como sustituto de la migración inicial con datos existentes.

`npm run db:seed` añade vocabulario inicial faltante únicamente al propietario indicado en `OWNER_USERNAME`. Para importar el archivo avanzado existente, usa `node --env-file=.env.local scripts/seed-postgres.mjs`; también respeta al propietario y evita duplicar sus palabras. Ninguno de estos comandos modifica el vocabulario de los invitados.

## Vercel

Configura en el entorno del despliegue `POSTGRES_URL`, `BETTER_AUTH_URL` con el dominio de producción, `BETTER_AUTH_SECRET` y `DEEPSEEK_API_KEY`; conserva `GROQ_API_KEY` si usas audio. `OWNER_*` se usa localmente para la preparación y no se necesita en Vercel. `APP_PASSWORD` deja de usarse y se puede retirar después del cambio.

La actualización del código no ejecuta la migración de producción automáticamente. Primero prepara la base con `db:setup-users`, luego despliega y verifica el acceso del administrador y del invitado.

## Comprobaciones

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Las pruebas de integración usan una base **desechable** cuyo nombre contenga `_test`, nunca la base de producción. Para probar una migración antigua, crea una base vacía e importa `tests/fixtures/legacy.sql`. Prepara un archivo local `.env.test` con:

```dotenv
POSTGRES_URL=postgres://usuario@localhost:5432/nameglish_test
TEST_DATABASE_URL=postgres://usuario@localhost:5432/nameglish_test
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=un-secreto-de-prueba-de-al-menos-32-caracteres
OWNER_USERNAME=valdefer
OWNER_NAME=Owner
OWNER_PASSWORD=test-owner-password-123
```

Usa esas mismas variables para el servidor local y las pruebas. Ejecuta primero `node --env-file=.env.test --import tsx scripts/setup-users.ts`, inicia el servidor con esas variables exportadas y ejecuta `node --env-file=.env.test --import tsx --test tests/users.integration.test.ts`. Las pruebas verifican conservación de datos, reejecución, registro cerrado, creación exclusiva por administrador, cuentas de nivel básico, sesiones falsas/caducadas/revocadas, límites de intentos y aislamiento real de acciones de servidor mediante identificadores ajenos.

Se actualizó Next.js dentro de la rama 16 para incorporar las correcciones del [aviso de seguridad oficial de octubre de 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026).

Para preparar la cuenta del propietario con la configuración privada local se puede usar `node --env-file=.env.production.local --import tsx scripts/setup-users.ts`. Si la conexión existente está guardada como un secreto no recuperable de Vercel, la misma preparación puede ejecutarse durante un despliegue controlado, usando las variables existentes del proyecto y las credenciales de inicialización privadas. No reconectes otra base ni reemplaces `POSTGRES_URL` para realizar la migración.

### Conservación del progreso al publicar

La preparación bloquea las tablas durante la transacción, copia las filas históricas a `no_nameglish_legacy_backup` y compara el número de filas y una huella de todo su contenido antes y después de asignarlas a `valdefer`. Solo se excluyen de esa comparación los campos nuevos `user_id` y `cefr_level`; las revisiones, identificadores, fechas y parámetros FSRS permanecen intactos. La copia histórica no se sobrescribe al repetir la preparación.

Para ejecutar esta preparación desde Vercel usando su conexión existente, configura `PROVISION_OWNER=1` y `OWNER_USERNAME`, `OWNER_NAME`, `OWNER_PASSWORD` en Production antes del despliegue. El comando de `vercel.json` detiene la compilación si falla la migración. Después de verificar el despliegue, establece `PROVISION_OWNER=0` y retira las credenciales temporales de preparación de los siguientes despliegues. La aplicación solo requiere las variables habituales de autenticación y PostgreSQL.

El 27 de octubre de 2026 se aplicó esta migración en producción: 101 tarjetas, 26 sesiones de estudio y 253 revisiones quedaron asignadas a `valdefer`, con comprobación de integridad y respaldo histórico. `PROVISION_OWNER` quedó desactivado después de la preparación.
