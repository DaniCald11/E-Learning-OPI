import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  TextField,
} from "@mui/material";
import { api } from "../services/api";
import { Icon } from "../components/Icon";
import { money, typeNames } from "../features/catalog/types";
import type { Category, PublishedProduct } from "../features/catalog/types";
export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("title");
  const [page, setPage] = useState(1);
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });
  const products = useQuery({
    queryKey: ["catalog", search, type, category, sort, page],
    queryFn: async () =>
      (
        await api.get<{ items: PublishedProduct[]; total: number }>(
          "/products",
          {
            params: {
              search,
              type: type || undefined,
              category: category || undefined,
              sort,
              page,
              pageSize: 9,
            },
          },
        )
      ).data,
  });
  return (
    <section className="catalog-page">
      <div className="catalog-heading">
        <div>
          <span className="eyebrow">CONOCIMIENTO QUE ABRE CAMINOS</span>
          <h1>
            Encuentra tu
            <br />
            <em>siguiente paso.</em>
          </h1>
        </div>
        <p>
          Cursos, talleres y formaciones para seguir construyendo lo que viene.
        </p>
      </div>
      <div className="catalog-filters">
        <TextField
          label="Buscar formación"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <TextField
          label="Tipo de formación"
          select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <MenuItem value="">Todos los tipos</MenuItem>
          {Object.entries(typeNames).map(([key, value]) => (
            <MenuItem key={key} value={key}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Categoría"
          select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <MenuItem value="">Todas las categorías</MenuItem>
          {categories.data?.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Ordenar"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <MenuItem value="title">Nombre</MenuItem>
          <MenuItem value="price-asc">Menor precio</MenuItem>
          <MenuItem value="price-desc">Mayor precio</MenuItem>
        </TextField>
      </div>
      {products.isPending ? (
        <CircularProgress aria-label="Cargando catálogo" />
      ) : products.isError ? (
        <Alert severity="error">No se pudo cargar el catálogo.</Alert>
      ) : products.data.items.length === 0 ? (
        <div className="empty-state">
          <Icon name="book" size={38} />
          <h2>Aquí comienza lo que viene.</h2>
          <p>No hay formaciones publicadas que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.data.items.map((p, index) => (
              <RouterLink
                to={"/formacion/" + p.slug}
                className="product-card"
                key={p.id}
              >
                <div className={"product-cover tone-" + (index % 3)}>
                  {p.coverMediaId ? (
                    <img
                      src={"/api/v1/media/" + p.coverMediaId + "/cover"}
                      alt=""
                    />
                  ) : (
                    <>
                      <Icon name="spark" size={75} />
                      <span>{p.category}</span>
                    </>
                  )}
                  <span className="product-type">{typeNames[p.type]}</span>
                </div>
                <div className="product-body">
                  <span className="eyebrow">
                    {p.category} · {p.courses.length}{" "}
                    {p.courses.length === 1 ? "CURSO" : "CURSOS"}
                  </span>
                  <h2>{p.title}</h2>
                  <p>{p.summary}</p>
                  <div>
                    <b>
                      {money(p.price)} <small>MXN</small>
                    </b>
                    <span className="card-arrow">
                      <Icon name="diagonal" />
                    </span>
                  </div>
                </div>
              </RouterLink>
            ))}
          </div>
          <Pagination
            count={Math.ceil(products.data.total / 9)}
            page={page}
            onChange={(_, value) => setPage(value)}
            sx={{ mt: 4 }}
          />
        </>
      )}
    </section>
  );
}
export function ProductDetailPage() {
  const { slug } = useParams();
  const query = useQuery({
    queryKey: ["public-product", slug],
    queryFn: async () =>
      (await api.get<PublishedProduct>("/products/" + slug)).data,
  });
  if (query.isPending)
    return (
      <div className="account-page">
        <CircularProgress />
      </div>
    );
  if (query.isError)
    return (
      <div className="account-page">
        <Alert severity="error">La formación no está disponible.</Alert>
      </div>
    );
  const p = query.data;
  return (
    <section className="catalog-page">
      <Button component={RouterLink} to="/catalogo">
        ← Volver al catálogo
      </Button>
      <div className="detail-grid">
        <div>
          <span className="eyebrow">
            {p.category} / {typeNames[p.type]}
          </span>
          <h1>{p.title}</h1>
          <p className="detail-summary">{p.summary}</p>
          <p className="preserve-text">{p.description}</p>
          <h2>Lo que vas a explorar</h2>
          {p.courses.map((c, i) => (
            <Accordion key={c.courseId} defaultExpanded={i === 0}>
              <AccordionSummary expandIcon={<span>+</span>}>
                {String(i + 1).padStart(2, "0")} · {c.title}
              </AccordionSummary>
              <AccordionDetails>
                <p>{c.description}</p>
                {c.outline.map((t) => (
                  <div key={t.id}>
                    <h3>{t.title}</h3>
                    {t.modules.map((m) => (
                      <div key={m.id}>
                        <b>{m.title}</b>
                        <ul>
                          {m.lessons.map((l) => (
                            <li key={l.id}>{l.title}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
        <aside className="detail-purchase">
          <div className="detail-art">
            {p.coverMediaId ? (
              <img src={"/api/v1/media/" + p.coverMediaId + "/cover"} alt="" />
            ) : (
              <Icon name="spark" size={90} />
            )}
          </div>
          <span className="eyebrow">{typeNames[p.type]}</span>
          <h2>
            {money(p.price)} <small>MXN</small>
          </h2>
          <p>
            {p.courses.length}{" "}
            {p.courses.length === 1 ? "curso incluido" : "cursos incluidos"}
          </p>
          {p.type === "Workshop" && (
            <p>
              Recorrido secuencial con cuestionarios. Un certificado final al
              completar el taller.
            </p>
          )}
          <p className="availability-note">
            La compra en línea aún no está habilitada.
          </p>
        </aside>
      </div>
    </section>
  );
}
