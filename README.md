# E-Learning-OPI

Plataforma e-learning de una organización, en español de México.

**Fase 1 — fundamentos e identidad.** Solución .NET 10 por capas, React/TypeScript,
SQL Server, registro/confirmación/login, recuperación, perfil y roles Admin/Student.
Un único administrador, cookies y CSRF. Catálogo y cursos esperan Fase 2 autorizada.

Desde la raíz:
```bash
python3 scripts/dev.py setup
python3 scripts/dev.py migrate
# En terminales separadas:
python3 scripts/dev.py api
python3 scripts/dev.py frontend
```

La configuración privada y credenciales locales se conservan en .data/development.json;
los correos de desarrollo en .data/mail. No versionar ni compartir esos archivos.

- [Especificación completa](specs.md): §18 prevalece, seguida de §17 y §15.1.
- [Guía de desarrollo y pruebas](docs/development.md).
- [Arquitectura](docs/architecture.md), [identidad](docs/decisions/0003-identity.md),
  [API](docs/api.md) y [base de datos](docs/database.md).
- [Análisis y pendientes](docs/analysis.md), [plan por fases](docs/implementation-plan.md)
  y [convenciones](docs/conventions.md).
- [Validación Fase 0](docs/phase0-validation.md) y [entrega Fase 1](docs/phase1-validation.md).

Invariantes de fases siguientes: cursos de taller excluidos de venta individual;
progreso compartido sin duplicar cursos ni matrículas; avance con videos terminados,
mejor nota ≥80 e intentos ilimitados; un certificado final por taller. Sin Drip,
Multi-Tenant, instructores ni funciones posteriores no autorizadas.
