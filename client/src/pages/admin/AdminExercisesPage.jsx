// Trang admin exercises hien thi va xu ly luong nguoi dung.
import { Check, ChevronDown, Dumbbell, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { exerciseApi } from "../../api/exerciseApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import FormField from "../../components/FormField";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, asPagination } from "../../utils/format";

const emptyForm = {
  externalId: "",
  name: "",
  status: "active",
  gifUrl: "",
  instructionsText: "",
  bodyPartIds: [],
  equipmentIds: [],
  targetMuscleIds: [],
  secondaryMuscleIds: [],
  rawDataText: "",
};

function selectedValues(event) {
  return Array.from(event.target.selectedOptions, (option) => option.value);
}

export default function AdminExercisesPage() {
  const [params, setParams] = useSearchParams({ page: "1", limit: "20" });
  const [filters, setFilters] = useState({
    keyword: params.get("keyword") || "",
    status: params.get("status") || "",
  });
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [taxonomy, setTaxonomy] = useState({ bodyParts: [], equipments: [], muscles: [] });
  const { data, loading, error, reload } = useAsync(() => adminApi.exercises(Object.fromEntries(params)), [params]);
  const rows = asItems(data);
  const pagination = asPagination(data);

  useEffect(() => {
    Promise.all([exerciseApi.listBodyParts(), exerciseApi.listEquipments(), exerciseApi.listMuscles()])
      .then(([bodyParts, equipments, muscles]) =>
        setTaxonomy({ bodyParts: asItems(bodyParts), equipments: asItems(equipments), muscles: asItems(muscles) }),
      )
      .catch(() => setTaxonomy({ bodyParts: [], equipments: [], muscles: [] }));
  }, []);

  function submitFilters(event) {
    event.preventDefault();
    setParams({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      page: "1",
      limit: params.get("limit") || "20",
    });
  }

  async function create(event) {
    event.preventDefault();
    try {
      let rawData;
      if (form.rawDataText.trim()) {
        try {
          rawData = JSON.parse(form.rawDataText);
        } catch {
          throw new Error("Raw data JSON is invalid");
        }
      }
      await exerciseApi.create({
        externalId: form.externalId || undefined,
        name: form.name,
        gifUrl: form.gifUrl || undefined,
        instructions: form.instructionsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        status: form.status,
        bodyPartIds: form.bodyPartIds,
        equipmentIds: form.equipmentIds,
        targetMuscleIds: form.targetMuscleIds,
        secondaryMuscleIds: form.secondaryMuscleIds,
        rawData,
      });
      setForm(emptyForm);
      showSuccess("Exercise created");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  async function review(id, status) {
    try {
      await adminApi.reviewExercise(
        id,
        status === "approved" ? { status } : { status, rejectionReason: "Rejected by admin" },
      );
      showSuccess("Exercise reviewed");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  async function deactivate(id) {
    try {
      await adminApi.deactivateExercise(id);
      showSuccess("Exercise deactivated");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Manage Exercises"
        actions={
          <button className="btn-primary" type="button" onClick={() => setShowCreate(!showCreate)}>
            <Plus size={17} /> Create exercise <ChevronDown className={showCreate ? "rotate-180" : ""} size={16} />
          </button>
        }
      />
      {showCreate && (
        <form className="panel mb-6 grid gap-4 md:grid-cols-2" onSubmit={create}>
          <FormField label="External ID">
            <input
              className="input"
              value={form.externalId}
              onChange={(event) => setForm({ ...form, externalId: event.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="rejected">Rejected</option>
            </select>
          </FormField>
          <FormField label="Name">
            <input
              className="input"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </FormField>
          <FormField label="GIF URL">
            <input
              className="input"
              value={form.gifUrl}
              onChange={(event) => setForm({ ...form, gifUrl: event.target.value })}
            />
          </FormField>
          <FormField label="Body parts">
            <select
              className="input min-h-28"
              multiple
              value={form.bodyPartIds}
              onChange={(event) => setForm({ ...form, bodyPartIds: selectedValues(event) })}
            >
              {taxonomy.bodyParts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Equipment">
            <select
              className="input min-h-28"
              multiple
              value={form.equipmentIds}
              onChange={(event) => setForm({ ...form, equipmentIds: selectedValues(event) })}
            >
              {taxonomy.equipments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Target muscles">
            <select
              className="input min-h-28"
              multiple
              value={form.targetMuscleIds}
              onChange={(event) => setForm({ ...form, targetMuscleIds: selectedValues(event) })}
            >
              {taxonomy.muscles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Secondary muscles">
            <select
              className="input min-h-28"
              multiple
              value={form.secondaryMuscleIds}
              onChange={(event) => setForm({ ...form, secondaryMuscleIds: selectedValues(event) })}
            >
              {taxonomy.muscles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Instructions">
              <textarea
                className="input min-h-28"
                placeholder={"1. Set your stance\n2. Control the movement\n3. Reset and repeat"}
                value={form.instructionsText}
                onChange={(event) => setForm({ ...form, instructionsText: event.target.value })}
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Raw data JSON">
              <textarea
                className="input min-h-24 font-mono"
                placeholder='{"difficulty":"beginner"}'
                value={form.rawDataText}
                onChange={(event) => setForm({ ...form, rawDataText: event.target.value })}
              />
            </FormField>
          </div>
          <button className="btn-primary" type="submit">
            <Dumbbell size={17} /> Create exercise
          </button>
        </form>
      )}
      <form className="panel mb-5 grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={submitFilters}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className="input pl-10"
            placeholder="Search exercises"
            value={filters.keyword}
            onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
          />
        </div>
        <select
          className="input"
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn-primary" type="submit">
          <Search size={17} /> Filter
        </button>
      </form>
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          {
            key: "taxonomy",
            header: "Taxonomy",
            render: (row) => (
              <div className="flex max-w-sm flex-wrap gap-1.5">
                {[...(row.bodyParts || []), ...(row.targetMuscles || [])].slice(0, 4).map((item) => (
                  <span className="tag" key={`${row.id}-${item.id || item.name}`}>
                    {item.name || item}
                  </span>
                ))}
              </div>
            ),
          },
          { key: "source", header: "Source" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary px-3"
                  title="Approve"
                  type="button"
                  onClick={() => review(row.id, "approved")}
                >
                  <Check size={16} />
                </button>
                <button
                  className="btn-secondary px-3"
                  title="Reject"
                  type="button"
                  onClick={() => review(row.id, "rejected")}
                >
                  <X size={16} />
                </button>
                <button className="btn-danger" type="button" onClick={() => deactivate(row.id)}>
                  Deactivate
                </button>
              </div>
            ),
          },
        ]}
        rows={rows}
      />
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onChange={(page) => setParams({ ...Object.fromEntries(params), page: String(page) })}
      />
    </>
  );
}
