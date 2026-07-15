// Trang exercise library hien thi va xu ly luong nguoi dung.
import { Heart, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { exerciseApi } from "../../api/exerciseApi";
import { favoriteApi } from "../../api/favoriteApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage } from "../../utils/errors";
import { asItems, asPagination } from "../../utils/format";

export default function ExerciseLibraryPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams({ page: "1", limit: "20" });
  const [filters, setFilters] = useState({
    keyword: "",
    bodyPart: "",
    equipment: "",
    targetMuscle: "",
    secondaryMuscle: "",
  });
  const [taxonomy, setTaxonomy] = useState({ bodyParts: [], equipments: [], muscles: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([exerciseApi.listBodyParts(), exerciseApi.listEquipments(), exerciseApi.listMuscles()])
      .then(([bodyParts, equipments, muscles]) =>
        setTaxonomy({ bodyParts: asItems(bodyParts), equipments: asItems(equipments), muscles: asItems(muscles) }),
      )
      .catch(() => setTaxonomy({ bodyParts: [], equipments: [], muscles: [] }));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setData(await exerciseApi.list(Object.fromEntries(params)));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params]);

  function submitFilters(event) {
    event.preventDefault();
    setParams({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      page: "1",
      limit: params.get("limit") || "20",
    });
  }

  async function favorite(id) {
    try {
      await favoriteApi.add(id);
      showSuccess("Exercise added to favorites");
    } catch (err) {
      showError(err);
    }
  }

  const rows = asItems(data);
  const pagination = asPagination(data);
  const detailBasePath = location.pathname.startsWith("/trainer/exercise-library")
    ? "/trainer/exercise-library"
    : "/exercises";

  return (
    <>
      <PageHeader
        title="Exercise Library"
        description="Browse active exercises and filter by body part, equipment, and muscles."
      />
      <form className="panel mb-6 grid gap-3 md:grid-cols-5" onSubmit={submitFilters}>
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className="input rounded-full pl-10"
            placeholder="Search"
            value={filters.keyword}
            onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
          />
        </div>
        <select
          className="input"
          value={filters.bodyPart}
          onChange={(event) => setFilters({ ...filters, bodyPart: event.target.value })}
        >
          <option value="">Body part</option>
          {taxonomy.bodyParts.map((item) => (
            <option key={item.id || item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filters.equipment}
          onChange={(event) => setFilters({ ...filters, equipment: event.target.value })}
        >
          <option value="">Equipment</option>
          {taxonomy.equipments.map((item) => (
            <option key={item.id || item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filters.targetMuscle}
          onChange={(event) => setFilters({ ...filters, targetMuscle: event.target.value })}
        >
          <option value="">Target muscle</option>
          {taxonomy.muscles.map((item) => (
            <option key={item.id || item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="submit">
          <Search size={17} /> Filter
        </button>
      </form>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          {rows.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((row) => (
                <article
                  className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
                  key={row.id}
                >
                  <Link className="relative block bg-slate-100" to={`${detailBasePath}/${row.id}`}>
                    {row.gifUrl || row.gif_url ? (
                      <img
                        className="aspect-square w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                        src={row.gifUrl || row.gif_url}
                        alt={row.name}
                      />
                    ) : (
                      <div className="grid aspect-square place-items-center text-sm text-slate-400">No media</div>
                    )}
                    <span className="absolute inset-x-4 bottom-4 rounded-lg bg-ink/80 px-3 py-2 text-center text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                      View detail
                    </span>
                  </Link>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link className="font-semibold text-ink hover:text-mint" to={`${detailBasePath}/${row.id}`}>
                        {row.name}
                      </Link>
                      {isAuthenticated && (
                        <button
                          className="btn-secondary px-3"
                          title="Favorite"
                          type="button"
                          onClick={() => favorite(row.id)}
                        >
                          <Heart size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(row.bodyParts || row.body_parts || []).slice(0, 3).map((x) => (
                        <span className="tag" key={x.id || x.name || x}>
                          {x.name || x}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      {(row.equipments || []).map((x) => x.name || x).join(", ") || "Bodyweight"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No exercises found" />
          )}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={(page) => setParams({ ...Object.fromEntries(params), page: String(page) })}
          />
        </>
      )}
    </>
  );
}
