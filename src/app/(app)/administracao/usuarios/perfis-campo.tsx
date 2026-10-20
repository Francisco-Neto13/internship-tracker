"use client";

// Profile link picker shared by the create form and the detail page (RF001, RF003). The
// server page passes the catalog, the courses and the concedentes; the API validates again.

export type OpcaoPerfil = { perfil: string; rotulo: string; exigeCurso: boolean; exigeConcedente: boolean; disponivel: boolean };
export type VinculoEscolhido = { perfil: string; curso_id: string | null; concedente_id: string | null };
type Opcao = { id: string; nome: string };

export const selectClass =
  "h-11 w-full rounded-md border border-navy-900/20 bg-white px-3 text-sm text-navy-900 outline-none transition-colors focus:border-azul-500 focus:ring-2 focus:ring-azul-500/25";

export function PerfisCampo({
  catalogo,
  cursos,
  concedentes,
  value,
  onChange,
}: {
  catalogo: OpcaoPerfil[];
  cursos: Opcao[];
  concedentes: Opcao[];
  value: VinculoEscolhido[];
  onChange: (vinculos: VinculoEscolhido[]) => void;
}) {
  const marcado = (perfil: string) => value.find((vinculo) => vinculo.perfil === perfil);

  function alternar(opcao: OpcaoPerfil, ativo: boolean) {
    const restantes = value.filter((vinculo) => vinculo.perfil !== opcao.perfil);
    const novo: VinculoEscolhido = {
      perfil: opcao.perfil,
      curso_id: opcao.exigeCurso ? (cursos[0]?.id ?? null) : null,
      concedente_id: opcao.exigeConcedente ? (concedentes[0]?.id ?? null) : null,
    };
    onChange(ativo ? [...restantes, novo] : restantes);
  }

  function escolher(perfil: string, campo: "curso_id" | "concedente_id", id: string) {
    onChange(value.map((vinculo) => (vinculo.perfil === perfil ? { ...vinculo, [campo]: id } : vinculo)));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-navy-900">Perfis</legend>
      {catalogo.map((opcao) => {
        const vinculo = marcado(opcao.perfil);
        const id = `perfil-${opcao.perfil}`;
        const semConcedente = opcao.exigeConcedente && concedentes.length === 0;
        return (
          <div key={opcao.perfil} className="flex flex-wrap items-center gap-3">
            <label htmlFor={id} className="flex items-center gap-2 text-sm text-navy-900">
              <input
                id={id}
                type="checkbox"
                disabled={!opcao.disponivel || semConcedente}
                checked={Boolean(vinculo)}
                onChange={(event) => alternar(opcao, event.target.checked)}
              />
              {opcao.rotulo}
              {semConcedente && <span className="text-xs text-navy-900/50">(cadastre uma concedente antes)</span>}
            </label>
            {vinculo && opcao.exigeCurso && (
              <select
                aria-label={`Curso da ${opcao.rotulo.toLowerCase()}`}
                className={`${selectClass} sm:w-64`}
                value={vinculo.curso_id ?? ""}
                onChange={(event) => escolher(opcao.perfil, "curso_id", event.target.value)}
              >
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome}
                  </option>
                ))}
              </select>
            )}
            {vinculo && opcao.exigeConcedente && (
              <select
                aria-label={`Concedente do perfil ${opcao.rotulo.toLowerCase()}`}
                className={`${selectClass} sm:w-64`}
                value={vinculo.concedente_id ?? ""}
                onChange={(event) => escolher(opcao.perfil, "concedente_id", event.target.value)}
              >
                {concedentes.map((concedente) => (
                  <option key={concedente.id} value={concedente.id}>
                    {concedente.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

/** Reads the API error envelope; `details` lists every rejected link at once. */
export async function mensagemDeErro(response: Response, padrao: string): Promise<string> {
  const body = await response.json().catch(() => null);
  const error = body?.error;
  if (!error) return padrao;
  const detalhes = Array.isArray(error.details) ? error.details.map((detail: { issue?: string; message?: string }) => detail.issue ?? detail.message) : [];
  return [error.message, ...detalhes].filter(Boolean).join(" ");
}
