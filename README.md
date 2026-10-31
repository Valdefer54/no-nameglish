# no-nameglish

Entrenador de vocabulario con repetición espaciada. Next.js 16.4.3, PostgreSQL, Drizzle y Better Auth. Requiere Node.js 22 o superior; Vercel usa Node.js 24.

## Cuentas y vocabulario

El acceso es por invitación, con nombre de usuario y contraseña; no requiere correo electrónico. El administrador crea cuentas desde **Users**; no hay registro público. Cada persona tiene tarjetas, revisiones, sesiones, racha y estadísticas independientes. Cada usuario puede cambiar su contraseña en **Account** y cerrar sesión.

Las sesiones incluyen un JWT firmado en una cookie HttpOnly y vencen **15 minutos después de iniciar sesión**, aunque se siga usando la aplicación. No se renuevan automáticamente: al vencer se vuelve al login y hay que introducir las credenciales de nuevo. Las APIs y acciones comprueban además la sesión en la base de datos para rechazar sesiones vencidas o revocadas. Al desplegar esta actualización, las sesiones antiguas de siete días requieren iniciar sesión de nuevo; el progreso guardado se conserva. Se utiliza la estrategia JWT integrada de [Better Auth](https://better-auth.com/docs/concepts/session-management).

Si la carga de una sesión de estudio falla o tarda más de 30 segundos, aparece un error con **Try again** y un enlace para volver al panel. Primero se buscan las tarjetas; si no hay pendientes no se crea una sesión vacía. Los reintentos de la misma apertura usan un identificador único por usuario para recuperar la sesión ya creada, incluso si se perdió su respuesta. Antes de desplegar este cambio aplica la migración `0004_session_start_retries.sql` con `npm run db:migrate`.

Al crear una cuenta se elige:

- **Beginner · A1 → A2 → B1**: 300 palabras y expresiones de uso cotidiano, 100 por nivel, con ejemplos originales cortos, significados y pistas en español. Las palabras nuevas siguen el orden del catálogo y los repasos pendientes tienen prioridad. Un nivel se desbloquea al estudiar todas las palabras del anterior y tener al menos el 80 % maduras (estabilidad >21 días y al menos 5 repasos). No tener repasos pendientes no desbloquea otro nivel. Los niveles desbloqueados se guardan en la cuenta y no retroceden por un olvido. Las sesiones básicas contienen hasta 10 tarjetas en total, incluyendo palabras nuevas y repasos.
- **Advanced · B2–C1**: vocabulario avanzado y las cinco categorías originales, con un límite de **5 tarjetas por categoría y día**, hasta 25 en total. Primero se presentan los repasos vencidos más antiguos; si solo hay 3, se completa con 2 palabras nuevas disponibles. Las tarjetas futuras nunca se adelantan: una programada para el viernes espera hasta el viernes. Si ese día hay más de 5 pendientes, el resto conserva su fecha y tiene prioridad al día siguiente.

Los límites diarios se cuentan entre todas las sesiones y pestañas, y se reinician a medianoche de **America/Bogota (Colombia)**. A1–B1 mantiene un límite de **10 tarjetas diarias en total**. Una palabra ya repasada ese día no vuelve a entrar en otra sesión. Consultar el panel o los mazos no modifica fechas FSRS ni ejecuta operaciones para rellenar sesiones. La migración `0005_daily_review_budget.sql` añade un índice para consultar los repasos del día.

La cuenta administradora conserva el nivel avanzado y sus datos anteriores. La lista básica es una selección propia con niveles orientativos, no una lista oficial de Oxford ni una certificación de B1. Complementa la práctica de comprensión, gramática y conversación.

Al completar B1, con las 300 palabras estudiadas y al menos 240 maduras en el conjunto, la cuenta pasa automáticamente a **B2–C1** y recibe su vocabulario avanzado una sola vez. Se muestra una felicitación hasta pulsar **Continuar con B2–C1**; el aviso se confirma para esa cuenta, también entre dispositivos. Se conservan las tarjetas, revisiones, parámetros FSRS y fechas de repaso de A1–B1. Los repasos anteriores siguen apareciendo cuando corresponde. La migración `0003_vocabulary_progression.sql` añade el nivel desbloqueado y el aviso pendiente; aplícala con `npm run db:migrate` antes de desplegar esta versión.

### Estimación para completar el vocabulario A1

A1 contiene 100 palabras. Con una sesión de hasta 10 tarjetas, cinco días por semana, hay capacidad para **50 presentaciones semanales**; esos espacios se comparten entre palabras nuevas y repasos. El mínimo de trabajo para estudiar todas y madurar 80 es `80 × 5 + 20 × 1 = 420` presentaciones, o 8,4 semanas de capacidad completa, pero los intervalos de FSRS obligan a esperar entre repasos y el calendario real es mayor.

Simulación reproducible: `node --import tsx scripts/estimate-a1.ts`. Se usa el selector real, los parámetros FSRS predeterminados y una sola sesión al mediodía de lunes a viernes, sin adelantar repasos. Se desactiva únicamente la variación aleatoria de los intervalos. Cada escenario usa 20 semillas; cada respuesta es **Good**, salvo el porcentaje indicado de **Again**.

| Respuestas Again | Ver las 100 palabras por primera vez, caso mediano | Alcanzar el 80 % de madurez, caso mediano | Rango entre simulaciones |
| --- | --- | --- | --- |
| 0 % | 36 días, unas 5 semanas | 197 días, 28 semanas, unos 6,5 meses | 28 semanas |
| 5 % | 40 días, unas 6 semanas | 282 días, 40 semanas, unos 9 meses | 29–43 semanas |
| 10 % | 54 días, unas 8 semanas | 284 días, 41 semanas, unos 9,5 meses | 29–44 semanas |
| 20 % | 109 días, unas 16 semanas | 333 días, 48 semanas, unos 11 meses | 41–60 semanas |

Son escenarios del algoritmo actual, no una predicción personal ni el tiempo para acreditar un nivel CEFR completo. Las respuestas **Hard/Easy**, más sesiones, ausencias y las tarjetas personales cambian el resultado. En particular, acertar mucho puede producir intervalos largos antes del quinto repaso: haber visto las 100 palabras no equivale a que el sistema ya las considere maduras.

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

La preparación bloquea las tablas durante la transacción, copia las filas históricas a `no_nameglish_legacy_backup` y compara el número de filas y una huella de todo su contenido antes y después de asignarlas a `valdefer`. Solo se excluyen de esa comparación los metadatos nuevos `user_id`, `cefr_level` y `request_id`; las revisiones, identificadores, fechas y parámetros FSRS permanecen intactos. La copia histórica no se sobrescribe al repetir la preparación.

Para ejecutar esta preparación desde Vercel usando su conexión existente, configura `PROVISION_OWNER=1` y `OWNER_USERNAME`, `OWNER_NAME`, `OWNER_PASSWORD` en Production antes del despliegue. El comando de `vercel.json` detiene la compilación si falla la migración. Después de verificar el despliegue, establece `PROVISION_OWNER=0` y retira las credenciales temporales de preparación de los siguientes despliegues. La aplicación solo requiere las variables habituales de autenticación y PostgreSQL.

El 27 de octubre de 2026 se aplicó esta migración en producción: 101 tarjetas, 26 sesiones de estudio y 253 revisiones quedaron asignadas a `valdefer`, con comprobación de integridad y respaldo histórico. `PROVISION_OWNER` quedó desactivado después de la preparación.
