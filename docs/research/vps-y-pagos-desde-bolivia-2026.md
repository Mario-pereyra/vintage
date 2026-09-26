# VPS baratos y pagos al exterior desde Bolivia (2026)

Fecha de consulta de todas las fuentes: **2026-09-26**. Alcance: VPS de 0–10 USD/mes para autoalojar una app TypeScript full-stack (Node 22+, Next.js o React Router en modo servidor), Postgres y fotos (~5–15 GB, en crecimiento) de una tienda pequeña en Santa Cruz de la Sierra, administrada por un solo desarrollador. Se compara con la opción serverless de [infraestructura-gratuita-2026.md](./infraestructura-gratuita-2026.md).

**Convención**

- **[E]** Evidencia: está en la fuente enlazada (primaria salvo que se indique lo contrario).
- **[I]** Inferencia: conclusión mía a partir de la evidencia.
- "No confirmado" significa que la página oficial no lo mostraba (por ejemplo, porque el precio se carga con JavaScript). No equivale a "no existe".

---

## 1. Latencia de referencia desde Bolivia

No encontré mediciones públicas desde Santa Cruz. Uso **La Paz** como aproximación, con los promedios de ping de WonderNetwork ([La Paz pings](https://wondernetwork.com/pings/La%20Paz)) [E]:

| Destino | ms | Destino | ms |
|---|---|---|---|
| Lima | 47 | Miami | 89 |
| Santiago | 50 | Bogotá | 111 |
| Buenos Aires | 60 | Washington / Nueva York | 123–125 |
| São Paulo | 70 | Dallas | 132 |
| | | Frankfurt (≈ Hetzner/Contabo UE) | 216 |

[I] Desde Santa Cruz, São Paulo debería quedar algo más cerca que desde La Paz y Santiago algo más lejos; ambos rondan los 50–80 ms. Miami queda en unos 90 ms y Europa pasa de 200 ms. Para una tienda con SSR la diferencia entre 60 y 130 ms se nota poco. Los más de 200 ms de Europa sí se notan en cada navegación.

## 2. Proveedores

Todos los precios están en USD/mes, salvo que se indique otra moneda.

| Proveedor | Plan más barato razonable | DC más cercano a Bolivia | Backups / snapshots | Pagos |
|---|---|---|---|---|
| **Oracle Cloud Always Free** | **0 USD.** Ampere A1 (ARM): **2 OCPU y 12 GB** en total. 200 GB de bloque (boot + volúmenes), 10 TB de egress y 20 GB de Object Storage [E] ([Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)) | Tiene regiones en **São Paulo, Vinhedo, Santiago, Valparaíso y Bogotá** [E] ([Regions](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm)). Hay que crearlo todo en la *home region* [E] | 5 backups de volumen gratis [E] (misma fuente) | Tarjeta de crédito, o de débito "que funcione como crédito". **No acepta prepagas, virtuales ni débito con PIN** [E] ([FAQ](https://www.oracle.com/cloud/free/faq/)) |
| **Vultr** | **1 vCPU, 1 GB, 25 GB, 1 TB: 5 USD** (`vc2-1c-1gb`). **2 GB, 55 GB, 2 TB: 10 USD** [E] ([API pública de planes](https://api.vultr.com/v2/plans?type=vc2)) | **São Paulo, Santiago**, Ciudad de México, Miami y Dallas, todos al mismo precio [E] ([API regiones](https://api.vultr.com/v2/regions), campo `locations` de los planes) | Backups automáticos **+20 %** del precio [E] ([Docs](https://docs.vultr.com/support/platform/billing/how-much-does-it-cost-to-enable-automatic-backups)) | Tarjeta, **PayPal, cripto vía BitPay (BTC, ETH, USDC…)**, Alipay [E] ([Docs](https://docs.vultr.com/support/platform/billing/what-payment-methods-do-you-accept)) |
| **Akamai/Linode** | Nanode 1 GB, 25 GB, 1 TB: **5 USD** en Norteamérica (incluye Miami y Dallas) y **7 USD en São Paulo**. 2 GB: 12 USD en EE. UU. y 16,80 USD en São Paulo [E] ([NA](https://www.akamai.com/cloud/pricing/north-america), [São Paulo](https://www.akamai.com/cloud/pricing/sao-paulo)) | São Paulo y Miami | Backups: **2 USD** (Nanode en NA) y **2,80 USD** (São Paulo) [E] (mismas fuentes) | Tarjeta de crédito o débito, PayPal, Google Pay. Prepagas solo si son de una red soportada y válidas para operar en EE. UU. [E] ([Payment methods](https://techdocs.akamai.com/cloud-computing/docs/manage-payment-methods)) |
| **Hostinger VPS** | KVM 1: **1 vCPU, 4 GB, 50 GB NVMe, 4 TB a 6,49 USD** con **pago adelantado de 24 meses**. **Renueva a 11,99 USD** [E] ([VPS](https://www.hostinger.com/vps-hosting)) | **Brasil** (São Paulo) [E] ([Ubicaciones](https://www.hostinger.com/support/1583267-where-are-hostinger-servers-located/), [Blog DC Brasil](https://www.hostinger.com/blog/brazilian-vps-data-center/)) | **Backups semanales y snapshot manual incluidos** [E] ([VPS](https://www.hostinger.com/vps-hosting)) | Tarjetas (incluidas prepagas), PayPal, Google/Apple Pay y **cripto** en la mayoría de regiones [E] ([Métodos de pago](https://www.hostinger.com/support/1583236-what-payment-methods-are-available-at-hostinger/)) |
| **Contabo** | Cloud VPS 4: **4 vCPU, 8 GB, 100 GB SSD, tráfico "ilimitado", puerto de 200 Mbit/s. 5,50 € con IVA (4,40 € sin IVA)**, precio **"for the first 24 months"** con contrato de 24 meses [E] ([VPS](https://contabo.com/en-us/vps/)) | **No tiene DC en Sudamérica.** Lo más cercano es EE. UU. (Nueva York, St. Louis, Seattle) [E] ([Locations](https://contabo.com/en/locations/)). Recargo por región: no confirmado | 1 snapshot. La promo actual trae **Auto Backup incluido** (diario, 10 días) [E] ([Auto Backup](https://contabo.com/en/auto-backup/)) | Tarjeta y PayPal en USD. **No acepta cripto** [E] ([Monedas](https://help.contabo.com/en/support/solutions/articles/103000269311-which-currencies-are-accepted-by-contabo-)) |
| **OVHcloud** | VPS-1: **2 vCore, 4 GB, 40 GB NVMe, tráfico ilimitado a 500 Mbps**. Cuesta **6,49 €/mes sin compromiso** desde el 2026-04-02 (antes 4,49 €) [E] ([Blog precios](https://blog.ovhcloud.com/en/posts/pricing-evolution-of-public-cloud-bare-metal-and-vps-at-ovhcloud/)). En el sitio de EE. UU. aparece "desde 4,54 USD" con pago anual [E] ([US VPS](https://us.ovhcloud.com/vps/)) | Sin Sudamérica. Hay Local Zones en **Miami y Dallas** [E] ([VPS AMD](https://us.ovhcloud.com/vps/vps-amd/)) | **Backup diario (24 h) incluido**. Premium desde 1,40 USD y snapshot desde 0,40 USD [E] ([US VPS](https://us.ovhcloud.com/vps/)) | No confirmado |
| **Hetzner Cloud** | Solo UE: **CX23 (2 vCPU, 4 GB, 40 GB, 20 TB) a 5,49 € / 6,49 USD**, CAX11 (ARM) a 5,99 € / 6,99 USD. Son los precios desde el **2026-06-15**, tras dos subidas en 2026 [E] ([Price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [Cost-optimized](https://www.hetzner.com/cloud/cost-optimized)). El 2026-09-26 la página marcaba CX23/CAX11 como **"currently unavailable"** [E] | EE. UU. solo con CPX11, desde **20,49 USD** [E] (misma fuente): **fuera de presupuesto**. En la UE son unos 216 ms | Backups **+20 %**, 7 slots. Snapshots por GB [E] ([Billing FAQ](https://docs.hetzner.com/cloud/billing/faq/)) | Tarjeta (Visa, MC, AMEX, UnionPay), PayPal (manual) y transferencia. "No ofrecemos todas las opciones en todos los países" [E] ([Payment overview](https://docs.hetzner.com/general/billing-and-account-management/billing-at-hetzner/payment-overview/)) |
| **DigitalOcean** | 512 MB: 4 USD. **1 GB, 25 GB, 1 TB: 6 USD** [E] ([Droplets](https://www.digitalocean.com/pricing/droplets)) | Sin Sudamérica. Lo más cercano es Atlanta o Nueva York [E] (misma fuente) | Backups del 20 % (semanal) o 30 % (diario). Snapshots a 0,06 USD/GB [E] (misma fuente) | Tarjeta, PayPal, Google/Apple Pay, stablecoins (disponibilidad limitada). **No acepta tarjetas virtuales, Electron ni prepagas** [E] ([Payment methods](https://docs.digitalocean.com/platform/billing/manage-payment-methods/)) |
| **AWS Lightsail** | 1 GB, 2 vCPU, 40 GB: **7 USD** (0,5 GB: 5 USD). En **São Paulo** el precio es el mismo, pero con **la mitad del tráfico** [E] ([Pricing](https://aws.amazon.com/lightsail/pricing/)) | São Paulo | Snapshots a 0,05 USD/GB [E] (misma fuente) | No investigado |
| **Google Cloud Free** | e2-micro gratis, pero solo en Oregón, Iowa o Carolina del Sur, y con **1 GB de egress al mes** [E] ([Free features](https://docs.cloud.google.com/free/docs/free-cloud-features)) | — | — | [I] Descartado: 1 GB de egress no alcanza para servir fotos |
| **Vultr Free Tier** | 1 vCPU, 512 MB, 10 GB. Solo en Miami, Seattle y Frankfurt, **por selección y con cupos** [E] ([API planes](https://api.vultr.com/v2/plans?type=vc2), plan `vc2-1c-0.5gb-free`). El detalle de requisitos (tarjeta y 2FA) viene de fuentes secundarias ([ejemplo](https://anothervps.com/vultr-offers-free-tier-vps/)) | Miami | — | [I] Con 512 MB no entran Node y Postgres. Descartado |

**Contexto de precios [E/I].** En 2026 Hetzner subió precios en abril y en junio, y OVH en abril. Ambos lo atribuyen a la inflación de la memoria RAM ([Hetzner](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [OVH](https://blog.ovhcloud.com/en/posts/pricing-evolution-of-public-cloud-bare-metal-and-vps-at-ovhcloud/)). [I] Conviene esperar más ajustes en 2026–2027. Una promo de 24 meses (Contabo, Hostinger) fija el precio, pero obliga a pagar todo por adelantado (Hostinger) o a quedarse atado 24 meses (Contabo).

### 2.1 Oracle Always Free en detalle (el único VPS a 0 USD que sirve)

- **Recorte de 2026.** [E] La doc actual dice: "All tenancies get the first 1,500 OCPU hours and 9,000 GB hours per month… equivalent to 2 OCPUs and 12 GB" ([Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)). Antes eran 4 OCPU y 24 GB. InfoQ (fuente secundaria) informa que el cambio rige desde el **2026-06-15**, sin anuncio de Oracle, y que hay confusión sobre si las cuentas Pay-As-You-Go conservan el límite viejo ([InfoQ](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)).
- **Reclamo por inactividad.** [E] Oracle puede reclamar una instancia Always Free si durante 7 días el **percentil 95 de CPU queda por debajo del 20 %**, la red por debajo del 20 % y (solo en A1) la **memoria por debajo del 20 %** ([Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)). Además, "Accounts left idle for 30 days or more may be deemed abandoned and become eligible for suspension or termination" ([FAQ](https://www.oracle.com/cloud/free/faq/)). [I] Una tienda con poco tráfico **cumple las tres condiciones de inactividad**. Postgres, Node y la caché de páginas pueden superar el 20 % de 12 GB de RAM, pero eso no está garantizado. La mitigación habitual es pasar la cuenta a Pay-As-You-Go: los recursos Always Free siguen siendo gratis ([FAQ](https://www.oracle.com/cloud/free/faq/)). La doc no dice expresamente que eso evite el reclamo.
- **Capacidad.** [E] El error "out of host capacity" significa "a temporary lack of Always Free shapes in your home region… might take several days" ([FAQ](https://www.oracle.com/cloud/free/faq/)). [I] La *home region* se elige al registrarse y no se puede cambiar. Si São Paulo o Santiago no tienen capacidad A1, puede costar días conseguir la instancia.
- **Tarjeta.** [E] La piden para verificar identidad, con retenciones temporales de autorización que no se cobran ([FAQ](https://www.oracle.com/cloud/free/faq/)).
- [I] **ARM64** no es problema: Node 22, Postgres y las imágenes Docker oficiales tienen builds arm64.

## 3. Pagar servicios en el exterior desde Bolivia (situación a sep-2026)

- **2023 a mar-2026.** [E] Por la escasez de dólares, los bancos restringieron el uso de tarjetas en el exterior. Algunos permitían solo 25 USD por semana y otros bloquearon el débito ([Infobae, 2026-04-07](https://www.infobae.com/america/america-latina/2026/04/07/bolivia-habilita-las-compras-con-tarjetas-bancarias-en-el-exterior-luego-de-tres-anos-de-restricciones/)).
- **Desde abril de 2026, liberado.** [E] La ASFI (Circular 938/2026, Resolución 280/2026, Carta Circular 864/2026, del 2026-04-10) restableció las **compras por internet y los pagos en el exterior** con tarjetas. Las reglas son: **débito, mínimo 500 USD/mes** (cada banco puede ampliarlo); **crédito, "sin restricciones"** más allá de la línea aprobada; tipo de cambio **referencial del BCB** sin recargos; y **sin comisiones** adicionales ([ASFI](https://www.asfi.gob.bo/node/1362)). El BCB (RD 43/2026) y la ASFI (Resolución 299/2026) fijaron el uso del **valor referencial de venta** publicado a diario ([Visión 360](https://www.vision360.bo/amp/noticias/2026/04/09/42988-la-asfi-ajusta-tarifas-para-giros-al-exterior-y-el-bcb-redefine-el-uso-del-tipo-de-cambio-en-tarjetas)).
- **Tipo de cambio.** [E] Al anunciarse, el referencial estaba en **8,96 / 9,15 Bs por USD**, frente al oficial de 6,96 ([Red Uno](https://www.reduno.com.bo/economia/cuanto-puedes-gastar-estos-son-los-nuevos-limites-tras-la-liberacion-de-tarjetas-202646124921), [Bloomberg Línea](https://www.bloomberglinea.com/latinoamerica/bolivia/bolivia-libera-uso-de-tarjetas-para-pagos-internacionales-pero-la-medida-ya-enciende-alertas/)). [I] En la práctica, pagar 5 USD cuesta unos 45–46 Bs, no 35.
- **Riesgo de reversión.** [E] Bloomberg Línea recoge alertas sobre la escasez de dólares y la inflación ([fuente](https://www.bloomberglinea.com/latinoamerica/bolivia/bolivia-libera-uso-de-tarjetas-para-pagos-internacionales-pero-la-medida-ya-enciende-alertas/)). [I] No encontré nuevas restricciones entre mayo y septiembre de 2026, pero el antecedente de 2023 aconseja **no depender de un único medio de pago** para la infraestructura.
- **Giros al exterior.** [E] Hasta 1.000 USD solo pagan el costo del corresponsal. Por encima, las comisiones van del 5 al 10 % ([Visión 360](https://www.vision360.bo/amp/noticias/2026/04/09/42988-la-asfi-ajusta-tarifas-para-giros-al-exterior-y-el-bcb-redefine-el-uso-del-tipo-de-cambio-en-tarjetas)). [I] No sirven para pagar un VPS.
- **PayPal.** [E] Se puede vincular una tarjeta de débito o crédito boliviana ([PayPal BO – tarjetas](https://www.paypal.com/bo/cshelp/article/%C2%BFqu%C3%A9-tarjetas-de-d%C3%A9bito-o-cr%C3%A9dito-puedo-utilizar-con-paypal-help612)). [I] Desde Bolivia PayPal **se financia con esa misma tarjeta**, así que no esquiva los límites bancarios. Solo añade un intermediario, útil con proveedores que cobran por PayPal de forma manual (Hetzner, Contabo, Vultr).
- **Cripto/USDT.** [E] La RD BCB 082/2024 (2024-06-25) derogó la prohibición de 2020 y permite usar instrumentos electrónicos de pago para comprar y vender activos virtuales ([BCB RD 082/2024](https://www.bcb.gob.bo/webdocs/01_resoluciones/RD%20082%202024.pdf), [BCB CP35/2024](https://www.bcb.gob.bo/webdocs/11_comunicados/CP_35%20NormativaActivosVirtuales.pdf)). [I] Comprar USDT en Binance P2P con bolivianos y pagar con BitPay (Vultr) o con la pasarela cripto de Hostinger es una **vía de respaldo** que no depende del cupo de la tarjeta. Tiene dos pegas: el spread del P2P y que los pagos en cripto no se reembolsan en Hostinger (fuente secundaria: [HostAdvice](https://hostadvice.com/blog/web-hosting/hostinger-payment-methods/)). DigitalOcean acepta stablecoins con "disponibilidad limitada" [E]. Contabo no acepta cripto [E].
- **Tarjetas prepagas o virtuales.** [E] Oracle y DigitalOcean las **rechazan** de forma explícita. Hostinger las acepta. Linode las acepta con condiciones (fuentes en la tabla). [I] Para Oracle hace falta una tarjeta de crédito (o un débito que funcione como crédito) de un banco boliviano.

## 4. PaaS autoalojado para simplificar el despliegue

| Herramienta | Madurez (GitHub, 2026-09-26) [E] | Requisitos [E] | Notas |
|---|---|---|---|
| **Coolify** | v4.3.23 (2026-09-18), ~62k estrellas, Apache-2.0 ([repo](https://github.com/coollabsio/coolify)) | **2 núcleos, 2 GB de RAM, 10 GB**. Corre con 1 núcleo y 512 MB, "not recommended". amd64 y arm64 ([Install](https://coolify.io/docs/get-started/installation)) | [E] Backups programados de Postgres a **S3-compatible** con retención ([Backups](https://coolify.io/docs/databases/backups)). El más completo |
| **Dokploy** | v0.30.7 (2026-09-18), ~37k estrellas, licencia propia ([repo](https://github.com/Dokploy/dokploy)) | **2 GB de RAM y 30 GB de disco** ([Install](https://docs.dokploy.com/docs/core/installation)) | [E] Backups de DB por cron a S3 y backups de volúmenes ([Backups](https://docs.dokploy.com/docs/core/databases/backups)). Todavía en versión 0.x |
| **CapRover** | v1.15.4 (2026-08-30), ~15k estrellas ([repo](https://github.com/caprover/caprover)) | **1 GB de RAM** ("512MB might not be enough" para builds). amd64 y arm64 ([Get started](https://caprover.com/docs/get-started.html)) | [I] El más liviano con interfaz web, pero con un ecosistema más chico |
| **Kamal** | v2.12.0 (2026-06-18), MIT, de 37signals ([repo](https://github.com/basecamp/kamal)) | No tiene panel: CLI (gem de Ruby o contenedor) por SSH, con Docker en el servidor y **un registry** ([Install](https://kamal-deploy.org/docs/installation/)) | [I] Casi no consume RAM en el servidor. Los backups de Postgres corren por tu cuenta |

[I] Con **1 GB de RAM** (Vultr o Linode a 5–7 USD), Coolify y Dokploy no entran bien junto a Node y Postgres. Ahí conviene **Kamal o docker compose**, con build en GitHub Actions y push a GHCR. Con **4 GB o más** (Hostinger KVM 1, Contabo, OVH, Oracle A1), **Coolify** es la opción más cómoda para un solo desarrollador: TLS automático, deploy desde Git y backups de Postgres a S3.

## 5. Backup offsite barato

| Destino | Gratis | Pago | Tarjeta | Notas |
|---|---|---|---|---|
| **Backblaze B2** | **10 GB siempre gratis**, con egress gratis hasta 3 veces lo almacenado [E] ([Pricing](https://www.backblaze.com/cloud-storage/pricing)) | 6,95 USD/TB-mes [E] | **"No credit card required"** para empezar [E] ([Sign-up](https://www.backblaze.com/sign-up/cloud-storage)) | S3-compatible: sirve para Coolify, Dokploy, restic y rclone |
| **Cloudflare R2** | **10 GB-mes**, 1M de operaciones clase A y 10M clase B, egress gratis [E] ([Pricing](https://developers.cloudflare.com/r2/pricing/)) | 0,015 USD/GB-mes [E] | Sí, exige medio de pago (ver el [informe anterior](./infraestructura-gratuita-2026.md)) | [I] Si las fotos ya viven en R2 para servirlas, no conviene usar el mismo proveedor como backup de ellas |
| **Hetzner Storage Box BX11** | — | 1 TB. Unos **3,20 €/mes** según listados de terceros ([whtop, feb-2026](https://www.whtop.com/plans/hetzner.com/128269)). **Precio oficial no confirmado** porque se carga con JS | Tarjeta, PayPal o transferencia [E] ([BX11](https://www.hetzner.com/storage/storage-box/bx11/)) | [E] Soporta SFTP, rsync, **BorgBackup y restic**, con 10 snapshots manuales y 10 automáticos, en Alemania o Finlandia ([Storage Box](https://www.hetzner.com/storage/storage-box/)) |

**Estrategia sugerida [I].**
1. `pg_dump` diario comprimido con Coolify o cron, más restic cifrado hacia **B2**. Un dump de un catálogo de 500 piezas pesa pocos MB.
2. Fotos: si se sirven desde R2, respaldarlas con `rclone sync` a B2. Si viven en el disco del VPS, usar restic a B2. Los 10 GB gratis cubren el arranque (unos 1,5–5 GB de derivados WebP); pasados los 10 GB, B2 cobra unos 0,007 USD/GB.
3. Snapshot semanal del proveedor si viene incluido (Hostinger, OVH, Contabo en la promo).
4. Probar una restauración cada trimestre.

## 6. Comparación con la opción serverless (Workers + Neon + R2)

| Criterio | Serverless (informe anterior) | VPS (≈5–7 USD, o Oracle a 0) |
|---|---|---|
| Costo | **0 USD** [E: capas gratuitas] | 5–7 USD/mes (unos 45–65 Bs al referencial), o 0 con Oracle |
| Tarjeta | Solo para R2. La variante con Cloudinary no la pide [E] | Siempre, salvo Hostinger o Vultr pagados con cripto o PayPal |
| Operación | Casi nula: sin SO, parches, TLS ni backups de disco [I] | Parches, firewall, monitoreo, backups y restauraciones a cargo de una sola persona [I] |
| Riesgo de corte | Topes de cuota: 100k req/día, 100 CU-h de Neon [E] | Reclamo de Oracle, caducidad de promos y **dependencia de pagar en USD mes a mes** [E/I] |
| Latencia | [E] Neon tiene región en **São Paulo** (`aws-sa-east-1`) ([Regions](https://neon.com/docs/introduction/regions)). Workers corre en el PoP más cercano [I] | 50–90 ms con DC en São Paulo, Santiago o Miami [E: pings] |
| Libertad técnica | 10 ms de CPU por request y runtime de Workers [E] | Node completo: sharp, colas, cron, Next.js sin adaptador [I] |
| Fotos (5–15 GB) | R2: 10 GB gratis y luego 0,015 USD/GB [E] | Disco local de 25–100 GB, sin costo por GB [E] |

## 7. Recomendación

1. **Seguir con la opción serverless A (React Router + Workers + Neon en São Paulo + R2) como principal.** [I] Cuesta 0 USD. Desde abril de 2026 una tarjeta de crédito boliviana ya puede registrarse en Cloudflare, y aunque R2 empiece a cobrar al pasar de 10 GB, 15 GB cuestan unos 0,08 USD/mes. Sobre todo, **ahorra operar un servidor**, que es lo más caro para un solo desarrollador.
2. **Si se prefiere o se necesita un VPS** (Next.js sin adaptador, sharp en el servidor, evitar los límites de CPU de Workers):
   - **Mejor relación precio/latencia pagando:** **Hostinger KVM 1 en Brasil** (4 GB, 50 GB, backups semanales, acepta cripto o PayPal). Cuesta 6,49 USD con 24 meses adelantados (unos 156 USD de una vez) y renueva a 11,99 USD [E]. Si no se puede pagar por adelantado, **Vultr 1 GB en Santiago o São Paulo** por 5 USD, o 6 USD con backups [E]: con Kamal o compose, sin Coolify.
   - **0 USD con riesgo:** **Oracle A1 (2 OCPU / 12 GB) con home region en São Paulo o Santiago**, con Coolify. Hay que asumir el riesgo de reclamo, el posible "out of host capacity" y el recorte silencioso de límites en 2026 [E]. Solo tiene sentido **con backups offsite diarios en B2** y un plan de migración ya ensayado.
   - **Descartados para Bolivia:** Hetzner (UE a 216 ms, EE. UU. desde 20 USD y sin stock en los planes baratos), Contabo, OVH y DigitalOcean (sin Sudamérica, a 90–130 ms o más). Funcionan, pero Hostinger y Vultr ofrecen lo mismo más cerca.
3. **Pagos:** registrar una **tarjeta de crédito** (sin tope regulatorio [E]) en lugar de una de débito (500 USD/mes, más que suficiente de todos modos), y tener **USDT o PayPal como respaldo** por si vuelven las restricciones [I].

---

## Resumen

1. Desde el **2026-04-07/10**, Bolivia volvió a permitir pagos al exterior con tarjeta. El débito tiene un tope mínimo de 500 USD/mes y el crédito queda sin tope regulatorio, al tipo de cambio referencial del BCB (≈9,15 Bs/USD en abril) y sin comisiones (ASFI).
2. Entre 2023 y marzo de 2026 hubo restricciones severas (algunos bancos permitían 25 USD por semana). El riesgo de que vuelvan justifica tener un respaldo (USDT vía P2P, legal desde la RD BCB 082/2024).
3. PayPal desde Bolivia se financia con la misma tarjeta, así que no evita los límites. Oracle y DigitalOcean rechazan tarjetas prepagas y virtuales.
4. Latencia aproximada desde Bolivia (La Paz): Santiago 50 ms, São Paulo 70, Miami 89, EE. UU. este y Dallas 123–132, Europa 216.
5. **Vultr:** 5 USD por 1 GB en São Paulo y Santiago, backups +20 %, acepta PayPal y cripto.
6. **Linode:** 5 USD en Miami y 7 USD en São Paulo, backups de 2–2,80 USD.
7. **Hostinger KVM 1 en Brasil:** 4 GB por 6,49 USD con 24 meses adelantados (renueva a 11,99), backups semanales incluidos, acepta cripto.
8. **Oracle Always Free** bajó a **2 OCPU / 12 GB** (junio de 2026). Tiene regiones en São Paulo, Santiago y Bogotá. Reclama instancias con CPU, red y RAM por debajo del 20 % durante 7 días, puede quedarse sin capacidad y pide tarjeta de crédito.
9. **Hetzner** subió precios dos veces en 2026 (CX23 a 5,49 €, solo UE y sin stock). En EE. UU. arranca en 20,49 USD, así que queda descartado. **Contabo** (8 GB por unos 4,40 € sin IVA en 24 meses) y **OVH** (6,49 €) no tienen DC en Sudamérica.
10. **Coolify** (v4.3, 2 GB mínimo) es la mejor opción de PaaS con 4 GB o más. Con 1 GB conviene **Kamal** o compose con build en CI.
11. **Backups offsite:** Backblaze B2 (10 GB gratis, sin tarjeta, S3) con restic y `pg_dump` diario. R2 da 10 GB gratis pero pide tarjeta.
12. **Recomendación:** mantener la opción serverless (Workers + Neon São Paulo + R2) a 0 USD. Si hace falta un VPS, Hostinger KVM 1 Brasil o Vultr en Santiago o São Paulo. Oracle A1 solo con backups diarios y un plan de salida.
