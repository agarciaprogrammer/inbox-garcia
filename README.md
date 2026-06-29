# Project Overview

## Philosophy

Este proyecto **no es una aplicación de notas**.
Es una **memoria externa** o **inbox personal** donde todo puede capturarse en segundos, sin fricción.
El flujo es extremadamente simple:

```
Quiero recordar algo
        ↓
Lo guardo
        ↓
Fin
```

La organización ocurre **después**, nunca antes.
El objetivo es reemplazar el comportamiento que mucha gente ya tiene con WhatsApp: abrir un chat personal, pegar algo y seguir con su vida.

---

# Design Principles

## Capture First

El usuario nunca debería tener que decidir:

* Categoría
* Etiquetas
* Prioridad
* Color
* Carpeta
* Proyecto

Cada decisión adicional aumenta la fricción y hace que el sistema deje de usarse.

Guardar información debe tomar uno o dos clics como máximo.

---

## Chat-based Interface

La pantalla principal será un chat cronológico.

```
🔍 Search...

──────────────────────────

🖼 foto.png          15:22

──────────────────────────

🔗 mercadolibre.com  15:01

──────────────────────────

📄 terraform.tf      14:35

──────────────────────────

📝 Acordarme de...

                    13:50
```

No existen carpetas ni vistas complejas.

Todo vive en una única línea temporal.

---

# Quick Capture

El botón `+` debe abrir únicamente las acciones necesarias:

* 📷 Cámara
* 🖼 Imagen
* 📄 Archivo
* ✍️ Nota

Nada más.

La aplicación también debe soportar **paste inteligente**.

Al presionar `Ctrl + V` (o pegar desde el teléfono), detecta automáticamente el contenido:

* Texto
* Imagen
* Archivo
* URL

y crea el elemento correspondiente sin pasos intermedios.

---

# Rich Content

## URLs

Al pegar un enlace, la aplicación obtiene automáticamente la información mediante Open Graph.

Ejemplo:

```
🌐 Mercado Libre

Set de Mate Gadnic

mercadolibre.com.ar

$39.999
```

Esto hace que el historial sea mucho más visual y fácil de recorrer.

---

## Images

* Thumbnail automático
* Click para abrir en Lightbox

---

## Files

Mostrar información básica:

```
📄 kubeconfig-prod.yaml

3 KB

29 Jun 2026
```

Click para descargar.

---

# Search

La búsqueda es una de las funcionalidades principales.

Debe funcionar sobre absolutamente todo.

Ejemplos:

```
docker
```

Devuelve:

* notas
* archivos
* links

```
amazon
```

Devuelve únicamente contenido relacionado con Amazon.

```
pdf
```

Devuelve todos los PDF.

```
ayer
```

Devuelve todo lo agregado ese día.

---

# Filters

No existen carpetas.

Sólo filtros rápidos:

* All
* Notes
* Links
* Photos
* Videos
* Files
* Favorites

Muy similar a Telegram.

---

# Adaptive Cards

Cada tipo de contenido tiene su propia representación visual.

**Link**

```
🌐

Mercado Libre

Set de Mate Gadnic
```

**Nota**

```
📝

Comprar filtro Hario
```

**Imagen**

```
📷

Thumbnail
```

**PDF**

```
📄

Factura.pdf
```

Esto hace que el historial sea mucho más agradable de recorrer que una lista uniforme.

---

# Data Model

Una única tabla es suficiente.

```sql
items
-----

id
user_id
type
text
title
url
storage_path
mime
created_at
favorite
```

Dependiendo del tipo de elemento se utilizan distintos campos.

No es necesario dividir la información en múltiples tablas.

---

# Storage

Los archivos binarios se almacenan en Supabase Storage.

```
uploads/
    2026/
        06/
            uuid.png
            uuid.pdf
```

La base de datos únicamente guarda la ruta del archivo.

---

# Authentication

Utilizar Supabase Auth con Google.

Tabla mínima de perfiles:

```sql
profiles

id
email
role
```

Ejemplo:

| Email                                   | Role   |
| --------------------------------------- | ------ |
| [agus@gmail.com](mailto:agus@gmail.com) | admin  |
| [test@gmail.com](mailto:test@gmail.com) | tester |

Esto reduce considerablemente la complejidad del backend.

---

# Progressive Web App

La aplicación debe funcionar como una PWA.

En dispositivos móviles el flujo ideal es:

1. Agregar a la pantalla principal.
2. Abrir desde el ícono.
3. Guardar contenido.
4. Cerrar.

Debe sentirse como una aplicación nativa, no como un sitio web.

---

# Core Principle

La decisión más importante del proyecto es su enfoque.

No debe diseñarse como un gestor de archivos.

Debe diseñarse como una **memoria externa**.

El éxito del producto no dependerá de la cantidad de funcionalidades, sino de que capturar cualquier información sea tan rápido y natural que el usuario termine utilizándolo durante años.
