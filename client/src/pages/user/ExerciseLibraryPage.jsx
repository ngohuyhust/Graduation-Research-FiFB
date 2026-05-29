import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { exerciseApi } from "../../api/exerciseApi";
import { favoriteApi } from "../../api/favoriteApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAuth } from "../../contexts/AuthContext";
import { asItems, asPagination } from "../../utils/format";

export default function ExerciseLibraryPage() {
  const { isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams({ page: "1", limit: "20" });
  const [filters, setFilters] = useState({ keyword: "", bodyPart: "", equipment: "", targetMuscle: "", secondaryMuscle: "" });
  const [taxonomy, setTaxonomy] = useState({ bodyParts: [], equipments: [], muscles: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([exerciseApi.listBodyParts(), exerciseApi.listEquipments(), exerciseApi.listMuscles()])
      .then(([bodyParts, equipments, muscles]) => setTaxonomy({ bodyParts: asItems(bodyParts), equipments: asItems(equipments), muscles: asItems(muscles) }))
      .catch(() => setTaxonomy({ bodyParts: [], equipments: [], muscles: [] }));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setData(await exerciseApi.list(Object.fromEntries(params)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params]);

  function submitFilters(event) {
    event.preventDefault();
    setParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page: "1", limit: params.get("limit") || "20" });
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

  return (
    <>
      <PageHeader title="Exercise Library" description="Browse active exercises and filter by body part, equipment, and muscles." />
      <form className="panel mb-6 grid gap-3 md:grid-cols-5" onSubmit={submitFilters}>
        <input className="input" placeholder="Search" value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} />
        <select className="input" value={filters.bodyPart} onChange={(event) => setFilters({ ...filters, bodyPart: event.target.value })}>
          <option value="">Body part</option>
          {taxonomy.bodyParts.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
        </select>
        <select className="input" value={filters.equipment} onChange={(event) => setFilters({ ...filters, equipment: event.target.value })}>
          <option value="">Equipment</option>
          {taxonomy.equipments.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
        </select>
        <select className="input" value={filters.targetMuscle} onChange={(event) => setFilters({ ...filters, targetMuscle: event.target.value })}>
          <option value="">Target muscle</option>
          {taxonomy.muscles.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
        </select>
        <button className="btn-primary" type="submit"><Search size={17} /> Filter</button>
      </form>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          <DataTable
            columns={[
              { key: "name", header: "Name", render: (row) => <Link className="font-semibold text-steel" to={`/exercises/${row.id}`}>{row.name}</Link> },
              { key: "bodyParts", header: "Body Parts", render: (row) => (row.bodyParts || row.body_parts || []).map((x) => x.name || x).join(", ") || "-" },
              { key: "equipments", header: "Equipment", render: (row) => (row.equipments || []).map((x) => x.name || x).join(", ") || "-" },
              { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status || "active"} /> },
              { key: "actions", header: "Actions", render: (row) => isAuthenticated ? <button className="btn-secondary" type="button" onClick={() => favorite(row.id)}>Favorite</button> : "-" },
            ]}
            rows={rows}
          />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(page) => setParams({ ...Object.fromEntries(params), page: String(page) })} />
        </>
      )}
    </>
  );
}
